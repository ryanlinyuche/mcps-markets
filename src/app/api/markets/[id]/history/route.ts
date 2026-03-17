import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const marketId = Number(id)

  const marketRes = await db.execute({ sql: 'SELECT market_type FROM markets WHERE id = ?', args: [marketId] })
  const market = marketRes.rows[0] as unknown as { market_type: string } | undefined
  if (!market) return NextResponse.json([], { status: 404 })

  if (market.market_type === 'score') {
    const res = await db.execute({
      sql: `SELECT snapshot, recorded_at FROM market_history
            WHERE market_id = ? AND snapshot IS NOT NULL
            ORDER BY recorded_at ASC LIMIT 60`,
      args: [marketId],
    })
    return NextResponse.json(res.rows as unknown as { snapshot: string; recorded_at: string }[])
  }

  const res = await db.execute({
    sql: `SELECT yes_pool, no_pool, recorded_at FROM market_history
          WHERE market_id = ? ORDER BY recorded_at ASC LIMIT 60`,
    args: [marketId],
  })
  return NextResponse.json(res.rows as unknown as { yes_pool: number; no_pool: number; recorded_at: string }[])
}
