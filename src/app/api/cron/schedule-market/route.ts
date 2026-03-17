import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveScoreMarket, resolveMarketNA } from '@/lib/market-math'

const SCHEDULE_OPTIONS = [
  { label: 'Regular Day', sort_order: 0 },
  { label: 'Early Dismissal/Release', sort_order: 1 },
  { label: '2-Hour Delay', sort_order: 2 },
]

function getTodayTitle() {
  const d = new Date()
  const fmt = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' })
  return `${fmt} - MCPS School Schedule`
}

function auth(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  return secret === process.env.CRON_SECRET
}

export async function POST(request: NextRequest) {
  if (!auth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action, outcome } = await request.json()

  if (action === 'create') {
    const title = getTodayTitle()

    const existingRes = await db.execute({
      sql: "SELECT id FROM markets WHERE title = ? AND status IN ('open', 'pending_approval')",
      args: [title],
    })
    const existing = existingRes.rows[0] as unknown as { id: number } | undefined
    if (existing) {
      return NextResponse.json({ message: 'Market already exists', marketId: existing.id })
    }

    const adminRes = await db.execute({ sql: 'SELECT id FROM users WHERE is_admin = 1 LIMIT 1', args: [] })
    const admin = adminRes.rows[0] as unknown as { id: number } | undefined
    if (!admin) {
      return NextResponse.json({ error: 'No admin user found' }, { status: 500 })
    }

    const closes = new Date()
    closes.setHours(14, 30, 0, 0)

    const insertRes = await db.execute({
      sql: `INSERT INTO markets (title, description, school, market_type, creator_id, status, resolution_criteria, resolution_source, closes_at)
            VALUES (?, ?, ?, 'score', ?, 'open', ?, ?, ?)`,
      args: [
        title,
        'Bet on what type of school day it will be today.',
        'MCPS',
        admin.id,
        'Resolved based on official MCPS announcements.',
        'https://www.montgomeryschoolsmd.org/emergency/closings/',
        closes.toISOString(),
      ],
    })

    const marketId = Number(insertRes.lastInsertRowid)
    for (const opt of SCHEDULE_OPTIONS) {
      await db.execute({
        sql: 'INSERT INTO option_pools (market_id, label, amount, sort_order) VALUES (?, ?, 0, ?)',
        args: [marketId, opt.label, opt.sort_order],
      })
    }

    return NextResponse.json({ message: 'Market created', marketId, title })
  }

  if (action === 'resolve') {
    if (!outcome || !SCHEDULE_OPTIONS.some(o => o.label === outcome)) {
      return NextResponse.json({ error: `Invalid outcome. Must be one of: ${SCHEDULE_OPTIONS.map(o => o.label).join(', ')}` }, { status: 400 })
    }

    const title = getTodayTitle()
    const marketRes = await db.execute({ sql: "SELECT id FROM markets WHERE title = ? AND status = 'open'", args: [title] })
    const market = marketRes.rows[0] as unknown as { id: number } | undefined
    if (!market) {
      return NextResponse.json({ error: 'No open schedule market found for today' }, { status: 404 })
    }

    const adminRes = await db.execute({ sql: 'SELECT id FROM users WHERE is_admin = 1 LIMIT 1', args: [] })
    const adminId = (adminRes.rows[0] as unknown as { id: number } | undefined)?.id ?? 0

    await resolveScoreMarket(market.id, outcome, adminId, `Auto-resolved via MCPS schedule check. Outcome: ${outcome}`)
    return NextResponse.json({ message: 'Market resolved', marketId: market.id, outcome })
  }

  if (action === 'resolve_na') {
    const title = getTodayTitle()
    const marketRes = await db.execute({ sql: "SELECT id FROM markets WHERE title = ? AND status = 'open'", args: [title] })
    const market = marketRes.rows[0] as unknown as { id: number } | undefined
    if (!market) {
      return NextResponse.json({ error: 'No open schedule market found for today' }, { status: 404 })
    }

    const adminRes = await db.execute({ sql: 'SELECT id FROM users WHERE is_admin = 1 LIMIT 1', args: [] })
    const adminId = (adminRes.rows[0] as unknown as { id: number } | undefined)?.id ?? 0

    await resolveMarketNA(market.id, adminId, 'School closed - all bets refunded')
    return NextResponse.json({ message: 'Market resolved N/A (school closed)', marketId: market.id })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
