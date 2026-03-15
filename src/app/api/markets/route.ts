import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { computeOdds } from '@/lib/market-math'
import { Market } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'open'

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

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, description, closes_at } = await request.json()

  if (!title || title.trim().length < 5) {
    return NextResponse.json({ error: 'Title must be at least 5 characters' }, { status: 400 })
  }

  const result = db.prepare(`
    INSERT INTO markets (title, description, creator_id, closes_at)
    VALUES (?, ?, ?, ?)
  `).run(title.trim(), description?.trim() || null, Number(session.sub), closes_at || null)

  const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(result.lastInsertRowid) as Market

  return NextResponse.json(market, { status: 201 })
}
