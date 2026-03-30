export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { computeOdds, SCORE_OPTIONS } from '@/lib/market-math'
import { Market, OptionPool } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const bubbleId = Number(id)
  const userId = Number(session.sub)

  const memberRes = await db.execute({
    sql: 'SELECT 1 FROM bubble_members WHERE bubble_id = ? AND user_id = ?',
    args: [bubbleId, userId],
  })
  if (!memberRes.rows[0] && !session.isAdmin) {
    return NextResponse.json({ error: 'Not a member of this bubble' }, { status: 403 })
  }

  const marketsRes = await db.execute({
    sql: `SELECT m.*, u.name as creator_name
          FROM markets m JOIN users u ON m.creator_id = u.id
          WHERE m.bubble_id = ? ORDER BY m.created_at DESC`,
    args: [bubbleId],
  })
  const markets = marketsRes.rows as unknown as (Market & { creator_name: string })[]

  const enriched = markets.map(m => {
    const { yesPrice, noPrice } = computeOdds(m.yes_pool, m.no_pool)
    return { ...m, yes_price: yesPrice, no_price: noPrice }
  })

  const scoreIds = enriched.filter(m => m.market_type === 'score' || m.market_type === 'personal_score').map(m => m.id)
  const optionsByMarket: Record<number, OptionPool[]> = {}
  if (scoreIds.length > 0) {
    const optsRes = await db.execute({
      sql: `SELECT * FROM option_pools WHERE market_id IN (${scoreIds.map(() => '?').join(',')}) ORDER BY sort_order`,
      args: scoreIds,
    })
    for (const opt of optsRes.rows as unknown as OptionPool[]) {
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const bubbleId = Number(id)
  const userId = Number(session.sub)

  const memberRes = await db.execute({
    sql: 'SELECT 1 FROM bubble_members WHERE bubble_id = ? AND user_id = ?',
    args: [bubbleId, userId],
  })
  if (!memberRes.rows[0]) {
    return NextResponse.json({ error: 'You must be a bubble member to create markets' }, { status: 403 })
  }

  const body = await request.json()
  const {
    title,
    description,
    market_type,
    closes_at,
    resolution_criteria,
    resolution_source,
    options,
    score_subtype,
    score_threshold,
    period_class,
    sport,
    team_a,
    team_b,
    subject_user_id,
  } = body

  if (!title?.trim() || title.trim().length < 5) {
    return NextResponse.json({ error: 'Title must be at least 5 characters' }, { status: 400 })
  }
  if (!closes_at) {
    return NextResponse.json({ error: 'A deadline is required' }, { status: 400 })
  }

  const insertRes = await db.execute({
    sql: `INSERT INTO markets
          (title, description, market_type, creator_id, status, closes_at, resolution_criteria, resolution_source,
           score_subtype, score_threshold, period_class, sport, team_a, team_b, subject_user_id, bubble_id)
          VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      title.trim(),
      description?.trim() || null,
      market_type || 'yesno',
      userId,
      closes_at,
      resolution_criteria?.trim() || null,
      resolution_source?.trim() || null,
      score_subtype || null,
      score_threshold || null,
      period_class || null,
      sport || null,
      team_a || null,
      team_b || null,
      subject_user_id || null,
      bubbleId,
    ],
  })
  const marketId = Number(insertRes.lastInsertRowid)

  // Insert option pools for score markets
  const isScore = market_type === 'score' || market_type === 'personal_score'
  const isLetterGrade = isScore && score_subtype !== 'overunder'
  if (isLetterGrade) {
    const opts = (Array.isArray(options) && options.length > 0) ? options : SCORE_OPTIONS.map(o => o.label)
    for (let i = 0; i < opts.length; i++) {
      await db.execute({
        sql: 'INSERT INTO option_pools (market_id, label, amount, sort_order) VALUES (?, ?, 0, ?)',
        args: [marketId, opts[i], i],
      })
    }
  }

  const market = await db.execute({ sql: 'SELECT * FROM markets WHERE id = ?', args: [marketId] })
  return NextResponse.json(market.rows[0], { status: 201 })
}
