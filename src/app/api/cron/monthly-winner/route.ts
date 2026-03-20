export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Previous month
  const now = new Date()
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear()
  const month = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth() // 1-12

  // Check if already recorded
  const existing = await db.execute({
    sql: 'SELECT id FROM monthly_winners WHERE year = ? AND month = ?',
    args: [year, month],
  })
  if (existing.rows[0]) {
    return NextResponse.json({ message: 'Already recorded for this month', year, month })
  }

  // Find highest balance user
  const topRes = await db.execute({
    sql: 'SELECT id, name, balance FROM users ORDER BY balance DESC LIMIT 1',
    args: [],
  })
  const top = topRes.rows[0] as unknown as { id: number; name: string; balance: number } | undefined
  if (!top) {
    return NextResponse.json({ message: 'No users found' })
  }

  await db.execute({
    sql: 'INSERT OR IGNORE INTO monthly_winners (year, month, user_id, user_name, coins) VALUES (?, ?, ?, ?, ?)',
    args: [year, month, top.id, top.name, top.balance],
  })

  return NextResponse.json({ message: `Recorded winner for ${year}-${month}: ${top.name} with ${top.balance} coins` })
}
