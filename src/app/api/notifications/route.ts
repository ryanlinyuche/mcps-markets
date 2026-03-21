export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export interface Notification {
  id: number
  user_id: number
  type: string
  market_id: number | null
  message: string
  read: number
  created_at: string
}

// GET /api/notifications — fetch last 30 notifications for the logged-in user
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await db.execute({
    sql: `SELECT id, user_id, type, market_id, message, read, created_at
          FROM notifications
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 30`,
    args: [Number(session.sub)],
  })

  return NextResponse.json(res.rows)
}

// POST /api/notifications — mark all as read
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db.execute({
    sql: `UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0`,
    args: [Number(session.sub)],
  })

  return NextResponse.json({ success: true })
}
