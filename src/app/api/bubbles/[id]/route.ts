export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const bubbleId = Number(id)
  const userId = Number(session.sub)

  const bubbleRes = await db.execute({ sql: 'SELECT * FROM bubbles WHERE id = ?', args: [bubbleId] })
  const bubble = bubbleRes.rows[0] as unknown as { id: number; creator_id: number; invite_code: string } | undefined
  if (!bubble) return NextResponse.json({ error: 'Bubble not found' }, { status: 404 })

  const memberRes = await db.execute({
    sql: 'SELECT role FROM bubble_members WHERE bubble_id = ? AND user_id = ?',
    args: [bubbleId, userId],
  })
  const myMembership = memberRes.rows[0] as unknown as { role: string } | undefined
  if (!myMembership && !session.isAdmin) {
    return NextResponse.json({ error: 'You are not a member of this bubble' }, { status: 403 })
  }

  const membersRes = await db.execute({
    sql: `SELECT bm.bubble_id, bm.user_id, u.name, bm.balance, bm.role, bm.joined_at
          FROM bubble_members bm JOIN users u ON u.id = bm.user_id
          WHERE bm.bubble_id = ? ORDER BY bm.balance DESC`,
    args: [bubbleId],
  })

  let pendingRequests: unknown[] = []
  if (myMembership?.role === 'admin' || session.isAdmin) {
    const reqRes = await db.execute({
      sql: `SELECT bjr.id, bjr.bubble_id, bjr.user_id, u.name, bjr.status, bjr.created_at
            FROM bubble_join_requests bjr JOIN users u ON u.id = bjr.user_id
            WHERE bjr.bubble_id = ? AND bjr.status = 'pending' ORDER BY bjr.created_at ASC`,
      args: [bubbleId],
    })
    pendingRequests = reqRes.rows
  }

  return NextResponse.json({
    ...bubble,
    my_role: myMembership?.role ?? null,
    members: membersRes.rows,
    pending_requests: pendingRequests,
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const bubbleId = Number(id)
  const userId = Number(session.sub)

  const memberRes = await db.execute({
    sql: `SELECT role FROM bubble_members WHERE bubble_id = ? AND user_id = ?`,
    args: [bubbleId, userId],
  })
  const mem = memberRes.rows[0] as unknown as { role: string } | undefined
  if (mem?.role !== 'admin' && !session.isAdmin) {
    return NextResponse.json({ error: 'Only the bubble admin can edit it' }, { status: 403 })
  }

  const { name, description } = await request.json()
  if (!name?.trim() || name.trim().length < 2) {
    return NextResponse.json({ error: 'Bubble name must be at least 2 characters' }, { status: 400 })
  }

  await db.execute({
    sql: 'UPDATE bubbles SET name = ?, description = ? WHERE id = ?',
    args: [name.trim(), description?.trim() || null, bubbleId],
  })

  const updated = await db.execute({ sql: 'SELECT * FROM bubbles WHERE id = ?', args: [bubbleId] })
  return NextResponse.json(updated.rows[0])
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const bubbleId = Number(id)
  const userId = Number(session.sub)

  const bubbleRes = await db.execute({ sql: 'SELECT creator_id FROM bubbles WHERE id = ?', args: [bubbleId] })
  const bubble = bubbleRes.rows[0] as unknown as { creator_id: number } | undefined
  if (!bubble) return NextResponse.json({ error: 'Bubble not found' }, { status: 404 })
  if (bubble.creator_id !== userId && !session.isAdmin) {
    return NextResponse.json({ error: 'Only the bubble creator can delete it' }, { status: 403 })
  }

  // Refund open bubble market positions back to bubble member balances
  const openMarketsRes = await db.execute({
    sql: `SELECT id FROM markets WHERE bubble_id = ? AND status IN ('open', 'pending_resolution')`,
    args: [bubbleId],
  })
  for (const mkt of openMarketsRes.rows as unknown as { id: number }[]) {
    const posRes = await db.execute({
      sql: 'SELECT user_id, coins_bet FROM positions WHERE market_id = ?',
      args: [mkt.id],
    })
    for (const pos of posRes.rows as unknown as { user_id: number; coins_bet: number }[]) {
      await db.execute({
        sql: 'UPDATE bubble_members SET balance = balance + ? WHERE bubble_id = ? AND user_id = ?',
        args: [pos.coins_bet, bubbleId, pos.user_id],
      })
    }
  }

  // Delete bubble markets and their data
  const allMarketsRes = await db.execute({
    sql: 'SELECT id FROM markets WHERE bubble_id = ?',
    args: [bubbleId],
  })
  for (const mkt of allMarketsRes.rows as unknown as { id: number }[]) {
    await db.execute({ sql: 'DELETE FROM positions WHERE market_id = ?', args: [mkt.id] })
    await db.execute({ sql: 'DELETE FROM option_pools WHERE market_id = ?', args: [mkt.id] })
    await db.execute({ sql: 'DELETE FROM market_history WHERE market_id = ?', args: [mkt.id] })
    await db.execute({ sql: 'DELETE FROM notifications WHERE market_id = ?', args: [mkt.id] })
    await db.execute({ sql: 'DELETE FROM markets WHERE id = ?', args: [mkt.id] })
  }

  // Cascade deletes bubble_members and bubble_join_requests via ON DELETE CASCADE
  await db.execute({ sql: 'DELETE FROM bubbles WHERE id = ?', args: [bubbleId] })

  return NextResponse.json({ success: true })
}
