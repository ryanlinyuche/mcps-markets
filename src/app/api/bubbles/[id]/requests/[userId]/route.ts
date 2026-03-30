export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, userId: targetUserId } = await params
  const bubbleId = Number(id)
  const requesterId = Number(targetUserId)
  const adminId = Number(session.sub)

  // Only bubble admin can accept/reject
  const adminCheck = await db.execute({
    sql: `SELECT role FROM bubble_members WHERE bubble_id = ? AND user_id = ?`,
    args: [bubbleId, adminId],
  })
  const isAdmin = (adminCheck.rows[0] as unknown as { role: string } | undefined)?.role === 'admin'
  if (!isAdmin && !session.isAdmin) {
    return NextResponse.json({ error: 'Only the bubble admin can manage join requests' }, { status: 403 })
  }

  const bubbleRes = await db.execute({
    sql: 'SELECT starting_balance FROM bubbles WHERE id = ?',
    args: [bubbleId],
  })
  const bubble = bubbleRes.rows[0] as unknown as { starting_balance: number } | undefined
  if (!bubble) return NextResponse.json({ error: 'Bubble not found' }, { status: 404 })

  const { action } = await request.json() // 'accept' | 'reject'

  const reqRes = await db.execute({
    sql: `SELECT id FROM bubble_join_requests WHERE bubble_id = ? AND user_id = ? AND status = 'pending'`,
    args: [bubbleId, requesterId],
  })
  if (!reqRes.rows[0]) return NextResponse.json({ error: 'No pending request found' }, { status: 404 })

  if (action === 'accept') {
    // Check the requester is still not in any bubble
    const alreadyMember = await db.execute({
      sql: 'SELECT 1 FROM bubble_members WHERE user_id = ?',
      args: [requesterId],
    })
    if (alreadyMember.rows[0]) {
      await db.execute({
        sql: `UPDATE bubble_join_requests SET status = 'rejected' WHERE bubble_id = ? AND user_id = ?`,
        args: [bubbleId, requesterId],
      })
      return NextResponse.json({ error: 'User is already in another bubble' }, { status: 400 })
    }

    await db.execute({
      sql: `INSERT INTO bubble_members (bubble_id, user_id, balance, role) VALUES (?, ?, ?, 'member')`,
      args: [bubbleId, requesterId, bubble.starting_balance],
    })
    await db.execute({
      sql: `UPDATE bubble_join_requests SET status = 'approved' WHERE bubble_id = ? AND user_id = ?`,
      args: [bubbleId, requesterId],
    })
    return NextResponse.json({ success: true, action: 'accepted' })
  } else {
    await db.execute({
      sql: `UPDATE bubble_join_requests SET status = 'rejected' WHERE bubble_id = ? AND user_id = ?`,
      args: [bubbleId, requesterId],
    })
    return NextResponse.json({ success: true, action: 'rejected' })
  }
}
