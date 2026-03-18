export const dynamic = 'force-dynamic'

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
  const marketId = Number(id)

  const marketRes = await db.execute({
    sql: `SELECT m.*, u.name as creator_name, rb.name as resolved_by_name, su.name as subject_name
          FROM markets m
          JOIN users u ON m.creator_id = u.id
          LEFT JOIN users rb ON m.resolved_by = rb.id
          LEFT JOIN users su ON m.subject_user_id = su.id
          WHERE m.id = ?`,
    args: [marketId],
  })
  const market = marketRes.rows[0] as unknown as (Market & { creator_name: string; resolved_by_name: string | null; subject_name: string | null }) | undefined

  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }

  const { yesPrice, noPrice } = computeOdds(market.yes_pool, market.no_pool)

  let optionPools: OptionPool[] | undefined
  if (market.market_type === 'score' || market.market_type === 'personal_score') {
    const optsRes = await db.execute({ sql: 'SELECT * FROM option_pools WHERE market_id = ? ORDER BY sort_order', args: [marketId] })
    optionPools = optsRes.rows as unknown as OptionPool[]
  }

  const flagRes = await db.execute({ sql: 'SELECT COUNT(*) as count FROM resolution_flags WHERE market_id = ?', args: [marketId] })
  const flagCount = (flagRes.rows[0] as unknown as { count: number }).count

  let userPosition: Position | null = null
  let userFlagged = false
  if (session) {
    const posRes = await db.execute({
      sql: 'SELECT * FROM positions WHERE user_id = ? AND market_id = ?',
      args: [Number(session.sub), marketId],
    })
    if (posRes.rows[0]) userPosition = posRes.rows[0] as unknown as Position

    const flaggedRes = await db.execute({
      sql: 'SELECT 1 FROM resolution_flags WHERE user_id = ? AND market_id = ?',
      args: [Number(session.sub), marketId],
    })
    userFlagged = !!flaggedRes.rows[0]
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
