export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const usersRes = await db.execute({ sql: 'SELECT id FROM users', args: [] })
  const users = usersRes.rows as unknown as { id: number }[]

  for (const user of users) {
    await db.execute({
      sql: `UPDATE users SET balance = balance + 10 WHERE id = ?`,
      args: [user.id],
    })
    await db.execute({
      sql: `INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'daily_bonus', 10, 'Daily bonus - 10 coins')`,
      args: [user.id],
    })
  }

  return NextResponse.json({ message: `Gave 10 coins to ${users.length} users` })
}
