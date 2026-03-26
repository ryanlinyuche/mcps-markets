export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Daily bonus — only users who have placed at least 1 bet ever
  const usersRes = await db.execute({
    sql: `SELECT DISTINCT u.id FROM users u
          WHERE EXISTS (SELECT 1 FROM positions p WHERE p.user_id = u.id)`,
    args: [],
  })
  const users = usersRes.rows as unknown as { id: number }[]

  for (const user of users) {
    await db.execute({ sql: `UPDATE users SET balance = balance + 10 WHERE id = ?`, args: [user.id] })
    await db.execute({
      sql: `INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'daily_bonus', 10, 'Daily bonus - 10 coins')`,
      args: [user.id],
    })
  }

  // Delete inactive accounts (no bets in 30+ days, account older than 30 days, not admin)
  const inactiveRes = await db.execute({
    sql: `SELECT u.id FROM users u
          WHERE u.is_admin = 0
            AND datetime(u.created_at) <= datetime('now', '-30 days')
            AND NOT EXISTS (
              SELECT 1 FROM transactions t
              WHERE t.user_id = u.id
                AND t.type = 'bet_placed'
                AND datetime(t.created_at) >= datetime('now', '-30 days')
            )`,
    args: [],
  })
  const inactive = inactiveRes.rows as unknown as { id: number }[]

  for (const user of inactive) {
    await db.execute({ sql: 'DELETE FROM resolution_flags WHERE user_id = ?', args: [user.id] })
    await db.execute({ sql: 'DELETE FROM user_schedule WHERE user_id = ?', args: [user.id] })
    await db.execute({ sql: 'DELETE FROM positions WHERE user_id = ?', args: [user.id] })
    await db.execute({ sql: 'DELETE FROM transactions WHERE user_id = ?', args: [user.id] })
    await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [user.id] })
  }

  return NextResponse.json({
    message: `Gave 10 coins to ${users.length} users. Deleted ${inactive.length} inactive account(s).`,
    bonuses: users.length,
    deleted: inactive.length,
  })
}
