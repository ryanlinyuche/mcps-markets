import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { resolveMarket, resolveScoreMarket, resolveMarketNA } from '@/lib/market-math'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { outcome, resolution_notes } = await request.json()
  const resolvedBy = Number(session.sub)
  const notes: string | null = resolution_notes?.trim() || null

  const market = db.prepare('SELECT market_type FROM markets WHERE id = ?').get(Number(id)) as { market_type: string } | undefined
  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }

  try {
    if (outcome === 'N/A') {
      resolveMarketNA(Number(id), resolvedBy, notes)
    } else if (market.market_type === 'score' || market.market_type === 'personal_score') {
      if (!outcome || typeof outcome !== 'string') {
        return NextResponse.json({ error: 'Outcome is required' }, { status: 400 })
      }
      resolveScoreMarket(Number(id), outcome, resolvedBy, notes)
    } else {
      if (!['YES', 'NO'].includes(outcome)) {
        return NextResponse.json({ error: 'Outcome must be YES or NO' }, { status: 400 })
      }
      resolveMarket(Number(id), outcome as 'YES' | 'NO', resolvedBy, notes)
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to resolve market'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
