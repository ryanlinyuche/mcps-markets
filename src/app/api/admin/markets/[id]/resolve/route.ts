export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { resolveMarket, resolveScoreMarket, resolveMarketNA } from '@/lib/market-math'
import { notifyMarketResolved } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const marketId = Number(id)
  const resolvedBy = Number(session.sub)

  // Parse as FormData (contains optional file upload)
  const formData = await request.formData()
  const outcome = formData.get('outcome') as string | null
  const resolution_notes = formData.get('resolution_notes') as string | null
  const file = formData.get('file') as File | null
  const notes: string | null = resolution_notes?.trim() || null

  // Proof is required for YES/NO/grade resolutions, optional for N/A
  if (!file && outcome !== 'N/A') {
    return NextResponse.json({ error: 'Proof image is required to resolve a market' }, { status: 400 })
  }
  if (file && !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }
  if (file && file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
  }

  // Upload proof to Vercel Blob
  let proofUrl: string | null = null
  if (file) {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const blob = await put(`proof/admin-${marketId}-${Date.now()}.${ext}`, file, { access: 'public' })
    proofUrl = blob.url
  }

  const marketRes = await db.execute({
    sql: 'SELECT title, market_type FROM markets WHERE id = ?',
    args: [marketId],
  })
  const market = marketRes.rows[0] as unknown as { title: string; market_type: string } | undefined
  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }

  try {
    if (outcome === 'N/A') {
      await resolveMarketNA(marketId, resolvedBy, notes)
    } else if (market.market_type === 'score' || market.market_type === 'personal_score') {
      if (!outcome || typeof outcome !== 'string') {
        return NextResponse.json({ error: 'Outcome is required' }, { status: 400 })
      }
      await resolveScoreMarket(marketId, outcome, resolvedBy, notes)
    } else {
      if (!outcome || !['YES', 'NO'].includes(outcome)) {
        return NextResponse.json({ error: 'Outcome must be YES or NO' }, { status: 400 })
      }
      await resolveMarket(marketId, outcome as 'YES' | 'NO', resolvedBy, notes)
    }

    // Save proof URL if uploaded
    if (proofUrl) {
      await db.execute({
        sql: 'UPDATE markets SET resolution_proof = ? WHERE id = ?',
        args: [proofUrl, marketId],
      })
    }

    // Fire-and-forget notifications (non-critical)
    notifyMarketResolved(marketId, market.title, outcome ?? 'N/A').catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to resolve market'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
