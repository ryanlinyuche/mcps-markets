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

  const memberRes = await db.execute({
    sql: 'SELECT 1 FROM bubble_members WHERE bubble_id = ? AND user_id = ?',
    args: [bubbleId, userId],
  })
  if (!memberRes.rows[0] && !session.isAdmin) {
    return NextResponse.json({ error: 'Not a member of this bubble' }, { status: 403 })
  }

  const res = await db.execute({
    sql: `SELECT bm.user_id, u.name, bm.balance, bm.role, bm.joined_at
          FROM bubble_members bm JOIN users u ON u.id = bm.user_id
          WHERE bm.bubble_id = ? ORDER BY bm.balance DESC`,
    args: [bubbleId],
  })

  return NextResponse.json(res.rows)
}
