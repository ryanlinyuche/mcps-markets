export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const marketId = Number(id)
  // Check count
  const countRes = await db.execute({ sql: 'SELECT COUNT(*) as c FROM featured_markets', args: [] })
  const count = (countRes.rows[0] as unknown as { c: number }).c
  if (count >= 5) return NextResponse.json({ error: 'Max 5 featured markets' }, { status: 400 })
  // Check market exists and is open
  const mRes = await db.execute({ sql: "SELECT id FROM markets WHERE id = ? AND status = 'open'", args: [marketId] })
  if (!mRes.rows[0]) return NextResponse.json({ error: 'Market not found or not open' }, { status: 404 })
  await db.execute({ sql: 'INSERT OR IGNORE INTO featured_markets (market_id, sort_order) VALUES (?, ?)', args: [marketId, count] })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  await db.execute({ sql: 'DELETE FROM featured_markets WHERE market_id = ?', args: [Number(id)] })
  return NextResponse.json({ success: true })
}
