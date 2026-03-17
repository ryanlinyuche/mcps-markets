import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeOdds } from '@/lib/market-math'
import { Market } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending_approval'

  const res = await db.execute({
    sql: `SELECT m.*, u.name as creator_name,
            (SELECT COUNT(*) FROM resolution_flags rf WHERE rf.market_id = m.id) as flag_count
          FROM markets m
          JOIN users u ON m.creator_id = u.id
          WHERE m.status = ?
          ORDER BY m.created_at DESC`,
    args: [status],
  })
  const markets = res.rows as unknown as (Market & { creator_name: string; flag_count: number })[]

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
  await db.execute({ sql: 'UPDATE markets SET status = ? WHERE id = ?', args: [newStatus, marketId] })

  return NextResponse.json({ success: true, status: newStatus })
}
