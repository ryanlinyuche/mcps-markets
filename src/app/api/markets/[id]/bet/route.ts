export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { placeBet, placeScoreBet } from '@/lib/market-math'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { side, amount } = await request.json()

  const coins = Math.floor(Number(amount))
  if (!coins || coins < 1) {
    return NextResponse.json({ error: 'Amount must be at least 1 coin' }, { status: 400 })
  }

  const marketRes = await db.execute({ sql: 'SELECT market_type, score_subtype, closes_at FROM markets WHERE id = ?', args: [Number(id)] })
  const market = marketRes.rows[0] as unknown as { market_type: string; score_subtype: string | null; closes_at: string | null } | undefined
  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }
  if (market.closes_at && new Date(market.closes_at) < new Date()) {
    return NextResponse.json({ error: 'Betting period has closed for this market' }, { status: 400 })
  }

  // Score markets with letter_grade subtype use option pools (A/B/C/D/F).
  // Overunder score markets and all other types (yesno, sports, sat_act, teacher_quote) use YES/NO.
  const isLetterGradeScore =
    (market.market_type === 'score' || market.market_type === 'personal_score') &&
    market.score_subtype !== 'overunder'

  try {
    if (isLetterGradeScore) {
      if (!side || typeof side !== 'string') {
        return NextResponse.json({ error: 'Option is required' }, { status: 400 })
      }
      const result = await placeScoreBet(Number(session.sub), Number(id), side, coins)
      return NextResponse.json({ success: true, newBalance: result.balance })
    } else {
      if (!['YES', 'NO'].includes(side)) {
        return NextResponse.json({ error: 'Side must be YES or NO' }, { status: 400 })
      }
      const result = await placeBet(Number(session.sub), Number(id), side as 'YES' | 'NO', coins)
      return NextResponse.json({ success: true, newBalance: result.balance })
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to place bet'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
