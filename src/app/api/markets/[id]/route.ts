export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { computeOdds } from '@/lib/market-math'
import { Market, Position, OptionPool } from '@/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const marketId = Number(id)

  const marketRes = await db.execute({ sql: 'SELECT * FROM markets WHERE id = ?', args: [marketId] })
  const market = marketRes.rows[0] as unknown as { id: number; creator_id: number; status: string } | undefined
  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })

  const isAdmin = !!session.isAdmin
  const isCreator = Number(session.sub) === market.creator_id
  if (!isAdmin && !isCreator) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (market.status === 'resolved') return NextResponse.json({ error: 'Resolved markets cannot be edited' }, { status: 400 })

  const { title, description, closes_at, resolution_criteria, resolution_source, school, options } = await request.json()
  if (!title?.trim() || title.trim().length < 5) {
    return NextResponse.json({ error: 'Title must be at least 5 characters' }, { status: 400 })
  }
  if (!closes_at) {
    return NextResponse.json({ error: 'A deadline is required' }, { status: 400 })
  }

  if (isAdmin) {
    await db.execute({
      sql: `UPDATE markets SET title=?, description=?, closes_at=?, resolution_criteria=?, resolution_source=?, school=? WHERE id=?`,
      args: [
        title.trim(),
        description?.trim() || null,
        closes_at,
        resolution_criteria?.trim() || null,
        resolution_source?.trim() || null,
        school?.trim() || null,
        marketId,
      ],
    })
  } else {
    // Creator: reset to pending_approval for re-review
    await db.execute({
      sql: `UPDATE markets SET title=?, description=?, closes_at=?, resolution_criteria=?, resolution_source=?, status='pending_approval' WHERE id=?`,
      args: [
        title.trim(),
        description?.trim() || null,
        closes_at,
        resolution_criteria?.trim() || null,
        resolution_source?.trim() || null,
        marketId,
      ],
    })
  }

  // ── Update option pools if provided ────────────────────────────────────────
  if (Array.isArray(options) && options.length >= 2) {
    const newLabels: string[] = options.map((o: string) => String(o).trim()).filter(Boolean)

    // Get current pools
    const currentRes = await db.execute({
      sql: 'SELECT label, amount FROM option_pools WHERE market_id = ?',
      args: [marketId],
    })
    const current = currentRes.rows as unknown as { label: string; amount: number }[]
    const lockedLabels = current.filter(o => o.amount > 0).map(o => o.label)

    // Ensure no locked label is removed
    for (const locked of lockedLabels) {
      if (!newLabels.includes(locked)) {
        return NextResponse.json(
          { error: `Cannot remove option "${locked}" which already has bets placed on it` },
          { status: 400 }
        )
      }
    }

    // Delete all unlocked (amount = 0) options
    await db.execute({
      sql: 'DELETE FROM option_pools WHERE market_id = ? AND amount = 0',
      args: [marketId],
    })

    // Insert all new labels that aren't already locked (locked ones stay)
    for (let i = 0; i < newLabels.length; i++) {
      const label = newLabels[i]
      if (!lockedLabels.includes(label)) {
        await db.execute({
          sql: 'INSERT OR IGNORE INTO option_pools (market_id, label, amount, sort_order) VALUES (?, ?, 0, ?)',
          args: [marketId, label, i],
        })
      }
      // Update sort_order for locked options to match new list order
      if (lockedLabels.includes(label)) {
        await db.execute({
          sql: 'UPDATE option_pools SET sort_order = ? WHERE market_id = ? AND label = ?',
          args: [i, marketId, label],
        })
      }
    }
  }

  const updated = await db.execute({ sql: 'SELECT * FROM markets WHERE id = ?', args: [marketId] })
  return NextResponse.json(updated.rows[0])
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const marketId = Number(id)

  const marketRes = await db.execute({ sql: 'SELECT id FROM markets WHERE id = ?', args: [marketId] })
  if (!marketRes.rows[0]) return NextResponse.json({ error: 'Market not found' }, { status: 404 })

  // Refund all open positions
  const posRes = await db.execute({
    sql: 'SELECT user_id, coins_bet FROM positions WHERE market_id = ?',
    args: [marketId],
  })
  for (const pos of posRes.rows as unknown as { user_id: number; coins_bet: number }[]) {
    await db.execute({ sql: 'UPDATE users SET balance = balance + ? WHERE id = ?', args: [pos.coins_bet, pos.user_id] })
    await db.execute({
      sql: `INSERT INTO transactions (user_id, type, amount, market_id, description) VALUES (?, 'refund', ?, ?, 'Market deleted by admin')`,
      args: [pos.user_id, pos.coins_bet, marketId],
    })
  }

  // Delete related records in order
  await db.execute({ sql: 'DELETE FROM notifications WHERE market_id = ?', args: [marketId] })
  await db.execute({ sql: 'DELETE FROM resolution_flags WHERE market_id = ?', args: [marketId] })
  await db.execute({ sql: 'DELETE FROM market_history WHERE market_id = ?', args: [marketId] })
  await db.execute({ sql: 'DELETE FROM option_pools WHERE market_id = ?', args: [marketId] })
  await db.execute({ sql: 'DELETE FROM positions WHERE market_id = ?', args: [marketId] })
  await db.execute({ sql: 'DELETE FROM markets WHERE id = ?', args: [marketId] })

  return NextResponse.json({ success: true })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  const marketId = Number(id)

  const marketRes = await db.execute({
    sql: `SELECT m.*, u.name as creator_name, rb.name as resolved_by_name, su.name as subject_name
          FROM markets m
          JOIN users u ON m.creator_id = u.id
          LEFT JOIN users rb ON m.resolved_by = rb.id
          LEFT JOIN users su ON m.subject_user_id = su.id
          WHERE m.id = ?`,
    args: [marketId],
  })
  const market = marketRes.rows[0] as unknown as (Market & { creator_name: string; resolved_by_name: string | null; subject_name: string | null }) | undefined

  if (!market) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }

  const { yesPrice, noPrice } = computeOdds(market.yes_pool, market.no_pool)

  let optionPools: OptionPool[] | undefined
  if (market.market_type === 'score' || market.market_type === 'personal_score') {
    const optsRes = await db.execute({ sql: 'SELECT * FROM option_pools WHERE market_id = ? ORDER BY sort_order', args: [marketId] })
    optionPools = optsRes.rows as unknown as OptionPool[]
  }

  const flagRes = await db.execute({ sql: 'SELECT COUNT(*) as count FROM resolution_flags WHERE market_id = ?', args: [marketId] })
  const flagCount = (flagRes.rows[0] as unknown as { count: number }).count

  let userPosition: Position | null = null
  let userFlagged = false
  if (session) {
    const posRes = await db.execute({
      sql: 'SELECT * FROM positions WHERE user_id = ? AND market_id = ?',
      args: [Number(session.sub), marketId],
    })
    if (posRes.rows[0]) userPosition = posRes.rows[0] as unknown as Position

    const flaggedRes = await db.execute({
      sql: 'SELECT 1 FROM resolution_flags WHERE user_id = ? AND market_id = ?',
      args: [Number(session.sub), marketId],
    })
    userFlagged = !!flaggedRes.rows[0]
  }

  return NextResponse.json({
    ...market,
    yes_price: yesPrice,
    no_price: noPrice,
    option_pools: optionPools,
    user_position: userPosition,
    flag_count: flagCount,
    user_flagged: userFlagged,
  })
}
