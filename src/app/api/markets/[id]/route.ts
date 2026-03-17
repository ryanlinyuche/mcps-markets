import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { computeOdds } from '@/lib/market-math'
import { Market, Position, OptionPool } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  const market = db.prepare(`
    SELECT m.*, u.name as creator_name,
      rb.name as resolved_by_name,
      su.name as subject_name
    FROM markets m
    JOIN users u ON m.creator_id = u.id
    LEFT JOIN users rb ON m.resolved_by = rb.id
    LEFT JOIN users su ON m.subject_user_id = su.id
    WHERE m.id = ?
  `).get(Number(id)) as (Market & { creator_name: string; resolved_by_name: string | null; subject_name: string | null }) | undefined

  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }

  const { yesPrice, noPrice } = computeOdds(market.yes_pool, market.no_pool)

  let optionPools: OptionPool[] | undefined
  if (market.market_type === 'score' || market.market_type === 'personal_score') {
    optionPools = db.prepare(
      'SELECT * FROM option_pools WHERE market_id = ? ORDER BY sort_order'
    ).all(Number(id)) as OptionPool[]
  }

  const flagRow = db.prepare(
    'SELECT COUNT(*) as count FROM resolution_flags WHERE market_id = ?'
  ).get(Number(id)) as { count: number }
  const flagCount = flagRow.count

  let userPosition: Position | null = null
  let userFlagged = false
  if (session) {
    const positions = db.prepare(
      'SELECT * FROM positions WHERE user_id = ? AND market_id = ?'
    ).all(Number(session.sub), Number(id)) as Position[]
    if (positions.length > 0) userPosition = positions[0]

    const flagged = db.prepare(
      'SELECT 1 FROM resolution_flags WHERE user_id = ? AND market_id = ?'
    ).get(Number(session.sub), Number(id))
    userFlagged = !!flagged
  }

  return NextResponse.json({
    ...market,
    yes_price: yesPrice,
    no_price: noPrice,
    option_pools: optionPools,
    user_position: userPosition,
    flag_count: flagCount,
    user_flagged: userFlagged,
  })
}
