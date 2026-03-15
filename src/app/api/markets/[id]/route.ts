import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { computeOdds } from '@/lib/market-math'
import { Market, Position } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  const market = db.prepare(`
    SELECT m.*, u.name as creator_name
    FROM markets m
    JOIN users u ON m.creator_id = u.id
    WHERE m.id = ?
  `).get(Number(id)) as (Market & { creator_name: string }) | undefined

  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }

  const { yesPrice, noPrice } = computeOdds(market.yes_pool, market.no_pool)

  let userPosition: Position | null = null
  if (session) {
    const positions = db.prepare(
      'SELECT * FROM positions WHERE user_id = ? AND market_id = ?'
    ).all(Number(session.sub), Number(id)) as Position[]
    if (positions.length > 0) userPosition = positions[0]
  }

  return NextResponse.json({
    ...market,
    yes_price: yesPrice,
    no_price: noPrice,
    user_position: userPosition,
  })
}
