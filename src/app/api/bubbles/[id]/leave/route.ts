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

  const bubbleRes = await db.execute({ sql: 'SELECT creator_id FROM bubbles WHERE id = ?', args: [bubbleId] })
  const bubble = bubbleRes.rows[0] as unknown as { creator_id: number } | undefined
  if (!bubble) return NextResponse.json({ error: 'Bubble not found' }, { status: 404 })

  if (bubble.creator_id === userId) {
    return NextResponse.json({ error: 'The bubble creator cannot leave. Delete the bubble instead.' }, { status: 400 })
  }

  const memberRes = await db.execute({
    sql: 'SELECT 1 FROM bubble_members WHERE bubble_id = ? AND user_id = ?',
    args: [bubbleId, userId],
  })
  if (!memberRes.rows[0]) return NextResponse.json({ error: 'You are not in this bubble' }, { status: 400 })

  await db.execute({
    sql: 'DELETE FROM bubble_members WHERE bubble_id = ? AND user_id = ?',
    args: [bubbleId, userId],
  })

  return NextResponse.json({ success: true })
}
