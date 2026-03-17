import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const marketId = Number(id)
  const userId = Number(session.sub)

  const market = db.prepare('SELECT status FROM markets WHERE id = ?').get(marketId) as { status: string } | undefined
  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }
  if (market.status !== 'open') {
    return NextResponse.json({ error: 'Market is not open' }, { status: 400 })
  }

  const existing = db.prepare(
    'SELECT 1 FROM resolution_flags WHERE user_id = ? AND market_id = ?'
  ).get(userId, marketId)

  if (existing) {
    db.prepare('DELETE FROM resolution_flags WHERE user_id = ? AND market_id = ?').run(userId, marketId)
  } else {
    db.prepare('INSERT INTO resolution_flags (user_id, market_id) VALUES (?, ?)').run(userId, marketId)
  }

  const { count } = db.prepare(
    'SELECT COUNT(*) as count FROM resolution_flags WHERE market_id = ?'
  ).get(marketId) as { count: number }

  return NextResponse.json({ flagged: !existing, count })
}
