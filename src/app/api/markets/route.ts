import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { computeOdds, SCORE_OPTIONS } from '@/lib/market-math'
import { Market, OptionPool } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'open'
  const school = searchParams.get('school')

  let query = `
    SELECT m.*, u.name as creator_name, su.name as subject_name
    FROM markets m
    JOIN users u ON m.creator_id = u.id
    LEFT JOIN users su ON m.subject_user_id = su.id
    WHERE m.status = ?
  `
  const params: unknown[] = [status]
  if (school) { query += ' AND m.school = ?'; params.push(school) }
  query += ' ORDER BY m.created_at DESC'

  const markets = db.prepare(query).all(...params) as (Market & { creator_name: string; subject_name: string | null })[]

  const enriched = markets.map(m => {
    const { yesPrice, noPrice } = computeOdds(m.yes_pool, m.no_pool)
    return { ...m, yes_price: yesPrice, no_price: noPrice }
  })

  const scoreIds = enriched.filter(m => m.market_type === 'score' || m.market_type === 'personal_score').map(m => m.id)
  const optionsByMarket: Record<number, OptionPool[]> = {}
  if (scoreIds.length > 0) {
    const opts = db.prepare(
      `SELECT * FROM option_pools WHERE market_id IN (${scoreIds.map(() => '?').join(',')}) ORDER BY sort_order`
    ).all(...scoreIds) as OptionPool[]
    for (const opt of opts) {
      if (!optionsByMarket[opt.market_id]) optionsByMarket[opt.market_id] = []
      optionsByMarket[opt.market_id].push(opt)
    }
  }
  const withOptions = enriched.map(m => ({
    ...m,
    option_pools: (m.market_type === 'score' || m.market_type === 'personal_score') ? (optionsByMarket[m.id] ?? []) : undefined,
  }))

  return NextResponse.json(withOptions)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    title, description, closes_at, school, market_type,
    resolution_criteria, resolution_source,
    period_class, sport, team_a, team_b,
  } = await request.json()

  if (!title || title.trim().length < 5) {
    return NextResponse.json({ error: 'Title must be at least 5 characters' }, { status: 400 })
  }

  const creatorId = Number(session.sub)
  const isPersonalScore = market_type === 'personal_score'
  const isSports = market_type === 'sports'
  const type: 'yesno' | 'score' | 'personal_score' | 'sports' =
    isPersonalScore ? 'personal_score'
    : market_type === 'score' ? 'score'
    : isSports ? 'sports'
    : 'yesno'

  const subjectUserId = isPersonalScore ? creatorId : null

  // Enforce: if a period is specified for score markets, user must be enrolled
  if ((type === 'score' || type === 'personal_score') && period_class) {
    const enrolled = db.prepare(
      'SELECT 1 FROM user_schedule WHERE user_id = ? AND period = ?'
    ).get(creatorId, String(period_class))
    if (!enrolled) {
      return NextResponse.json({ error: 'You must be enrolled in this class to create a market for it' }, { status: 403 })
    }
  }

  const resolvedSchool = isSports ? 'Sports' : (school?.trim() || 'Winston Churchill High School')

  const result = db.prepare(`
    INSERT INTO markets (title, description, school, market_type, creator_id, subject_user_id,
                         closes_at, resolution_criteria, resolution_source,
                         period_class, sport, team_a, team_b)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(),
    description?.trim() || null,
    resolvedSchool,
    type,
    creatorId,
    subjectUserId,
    closes_at || null,
    resolution_criteria?.trim() || null,
    resolution_source?.trim() || null,
    (type === 'score' || type === 'personal_score') ? (period_class || null) : null,
    isSports ? (sport || null) : null,
    isSports ? (team_a?.trim() || null) : null,
    isSports ? (team_b?.trim() || null) : null,
  )

  const marketId = result.lastInsertRowid as number

  if (type === 'score' || type === 'personal_score') {
    for (const opt of SCORE_OPTIONS) {
      db.prepare(
        'INSERT INTO option_pools (market_id, label, amount, sort_order) VALUES (?, ?, 0, ?)'
      ).run(marketId, opt.label, opt.sort_order)
    }
  }

  const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId) as Market

  return NextResponse.json(market, { status: 201 })
}
