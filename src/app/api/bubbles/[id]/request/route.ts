export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const bubbleId = Number(id)
  const userId = Number(session.sub)

  // One bubble per user
  const existingMember = await db.execute({
    sql: 'SELECT 1 FROM bubble_members WHERE user_id = ?',
    args: [userId],
  })
  if (existingMember.rows[0]) {
    return NextResponse.json({ error: 'You are already in a bubble. Leave it first.' }, { status: 400 })
  }

  const bubbleRes = await db.execute({ sql: 'SELECT id FROM bubbles WHERE id = ?', args: [bubbleId] })
  if (!bubbleRes.rows[0]) return NextResponse.json({ error: 'Bubble not found' }, { status: 404 })

  // Check for existing pending request
  const existingReq = await db.execute({
    sql: `SELECT status FROM bubble_join_requests WHERE bubble_id = ? AND user_id = ?`,
    args: [bubbleId, userId],
  })
  if (existingReq.rows[0]) {
    return NextResponse.json({ error: 'You already have a pending request to join this bubble' }, { status: 400 })
  }

  await db.execute({
    sql: `INSERT INTO bubble_join_requests (bubble_id, user_id) VALUES (?, ?)`,
    args: [bubbleId, userId],
  })

  return NextResponse.json({ success: true })
}
