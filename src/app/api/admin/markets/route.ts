import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeOdds } from '@/lib/market-math'
import { Market } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending_approval'

  const markets = db.prepare(`
    SELECT m.*, u.name as creator_name
    FROM markets m
    JOIN users u ON m.creator_id = u.id
    WHERE m.status = ?
    ORDER BY m.created_at DESC
  `).all(status) as (Market & { creator_name: string })[]

  const enriched = markets.map(m => {
    const { yesPrice, noPrice } = computeOdds(m.yes_pool, m.no_pool)
    return { ...m, yes_price: yesPrice, no_price: noPrice }
  })

  return NextResponse.json(enriched)
}

export async function PATCH(request: NextRequest) {
  const { marketId, action } = await request.json()

  if (!marketId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const newStatus = action === 'approve' ? 'open' : 'rejected'
  db.prepare('UPDATE markets SET status = ? WHERE id = ?').run(newStatus, marketId)

  return NextResponse.json({ success: true, status: newStatus })
}
