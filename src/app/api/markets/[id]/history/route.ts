import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const market = db.prepare('SELECT market_type FROM markets WHERE id = ?').get(Number(id)) as { market_type: string } | undefined
  if (!market) return NextResponse.json([], { status: 404 })

  if (market.market_type === 'score') {
    const history = db.prepare(`
      SELECT snapshot, recorded_at
      FROM market_history
      WHERE market_id = ? AND snapshot IS NOT NULL
      ORDER BY recorded_at ASC
      LIMIT 60
    `).all(Number(id)) as { snapshot: string; recorded_at: string }[]
    return NextResponse.json(history)
  }

  const history = db.prepare(`
    SELECT yes_pool, no_pool, recorded_at
    FROM market_history
    WHERE market_id = ?
    ORDER BY recorded_at ASC
    LIMIT 60
  `).all(Number(id)) as { yes_pool: number; no_pool: number; recorded_at: string }[]

  return NextResponse.json(history)
}
