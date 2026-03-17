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

  const marketRes = await db.execute({ sql: 'SELECT status FROM markets WHERE id = ?', args: [marketId] })
  const market = marketRes.rows[0] as unknown as { status: string } | undefined
  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }
  if (market.status !== 'open') {
    return NextResponse.json({ error: 'Market is not open' }, { status: 400 })
  }

  const existingRes = await db.execute({
    sql: 'SELECT 1 FROM resolution_flags WHERE user_id = ? AND market_id = ?',
    args: [userId, marketId],
  })
  const existing = existingRes.rows[0]

  if (existing) {
    await db.execute({ sql: 'DELETE FROM resolution_flags WHERE user_id = ? AND market_id = ?', args: [userId, marketId] })
  } else {
    await db.execute({ sql: 'INSERT INTO resolution_flags (user_id, market_id) VALUES (?, ?)', args: [userId, marketId] })
  }

  const countRes = await db.execute({ sql: 'SELECT COUNT(*) as count FROM resolution_flags WHERE market_id = ?', args: [marketId] })
  const { count } = countRes.rows[0] as unknown as { count: number }

  return NextResponse.json({ flagged: !existing, count })
}
