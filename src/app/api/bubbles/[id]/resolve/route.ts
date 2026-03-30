export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { resolveBubbleMarket, resolveBubbleScoreMarket, resolveBubbleMarketNA } from '@/lib/market-math'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const bubbleId = Number(id)
  const userId = Number(session.sub)

  // Must be bubble admin or site admin
  const adminCheck = await db.execute({
    sql: `SELECT role FROM bubble_members WHERE bubble_id = ? AND user_id = ?`,
    args: [bubbleId, userId],
  })
  const role = (adminCheck.rows[0] as unknown as { role: string } | undefined)?.role
  if (role !== 'admin' && !session.isAdmin) {
    return NextResponse.json({ error: 'Only the bubble admin can resolve markets' }, { status: 403 })
  }

  const { market_id, outcome, notes } = await request.json()
  if (!market_id) return NextResponse.json({ error: 'market_id is required' }, { status: 400 })
  if (!outcome) return NextResponse.json({ error: 'outcome is required' }, { status: 400 })

  const marketRes = await db.execute({
    sql: 'SELECT market_type, score_subtype, bubble_id FROM markets WHERE id = ?',
    args: [Number(market_id)],
  })
  const market = marketRes.rows[0] as unknown as { market_type: string; score_subtype: string | null; bubble_id: number | null } | undefined
  if (!market || market.bubble_id !== bubbleId) {
    return NextResponse.json({ error: 'Market not found in this bubble' }, { status: 404 })
  }

  try {
    if (outcome === 'N/A') {
      await resolveBubbleMarketNA(Number(market_id), bubbleId, userId, notes || null)
    } else if ((market.market_type === 'score' || market.market_type === 'personal_score') && market.score_subtype !== 'overunder') {
      await resolveBubbleScoreMarket(Number(market_id), bubbleId, outcome, userId, notes || null)
    } else {
      if (outcome !== 'YES' && outcome !== 'NO') {
        return NextResponse.json({ error: 'Outcome must be YES, NO, or N/A' }, { status: 400 })
      }
      await resolveBubbleMarket(Number(market_id), bubbleId, outcome as 'YES' | 'NO', userId, notes || null)
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to resolve market'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
