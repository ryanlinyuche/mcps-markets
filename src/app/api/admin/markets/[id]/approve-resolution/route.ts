export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { resolveMarket, resolveScoreMarket, resolveMarketNA } from '@/lib/market-math'
import { notifyMarketResolved } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRes = await db.execute({ sql: 'SELECT is_admin FROM users WHERE id = ?', args: [Number(session.sub)] })
  const userRow = userRes.rows[0] as unknown as { is_admin: number } | undefined
  if (!userRow?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { id } = await params
  const marketId = Number(id)
  const { resolution_notes } = await request.json().catch(() => ({}))
  const notes: string | null = resolution_notes?.trim() || null

  const marketRes = await db.execute({
    sql: 'SELECT title, market_type, status, pending_outcome, team_a, team_b FROM markets WHERE id = ?',
    args: [marketId],
  })
  const market = marketRes.rows[0] as unknown as {
    title: string; market_type: string; status: string
    pending_outcome: string | null; team_a: string | null; team_b: string | null
  } | undefined
  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  if (market.status !== 'pending_resolution') return NextResponse.json({ error: 'Market is not pending resolution' }, { status: 400 })
  if (!market.pending_outcome) return NextResponse.json({ error: 'No pending outcome to approve' }, { status: 400 })

  const resolvedBy = Number(session.sub)

  // For sports markets, map team name → YES/NO (team_a = YES, team_b = NO)
  let outcome = market.pending_outcome
  if (market.market_type === 'sports' && outcome !== 'YES' && outcome !== 'NO' && outcome !== 'N/A') {
    if (outcome === market.team_a) outcome = 'YES'
    else if (outcome === market.team_b) outcome = 'NO'
    else return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
  }

  try {
    if (outcome === 'N/A') {
      await resolveMarketNA(marketId, resolvedBy, notes)
    } else if (market.market_type === 'score' || market.market_type === 'personal_score') {
      await resolveScoreMarket(marketId, outcome, resolvedBy, notes)
    } else {
      if (!['YES', 'NO'].includes(outcome)) return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
      await resolveMarket(marketId, outcome as 'YES' | 'NO', resolvedBy, notes)
    }

    // Clear pending fields now that it's resolved
    await db.execute({
      sql: `UPDATE markets SET pending_outcome = NULL, resolution_requested_by = NULL WHERE id = ?`,
      args: [marketId],
    })

    // Fire-and-forget notifications (non-critical)
    notifyMarketResolved(marketId, market.title, outcome).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to resolve market'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
