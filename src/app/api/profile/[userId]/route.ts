export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await params
  const uid = Number(userId)
  if (isNaN(uid)) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })

  // Basic user info
  const userRes = await db.execute({
    sql: 'SELECT id, name, balance, created_at FROM users WHERE id = ?',
    args: [uid],
  })
  const user = userRes.rows[0] as unknown as {
    id: number; name: string; balance: number; created_at: string
  } | undefined
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Rank
  const rankRes = await db.execute({
    sql: 'SELECT COUNT(*) + 1 AS rank FROM users WHERE balance > ?',
    args: [user.balance],
  })
  const rank = (rankRes.rows[0] as unknown as { rank: number }).rank

  // All positions with market data
  const posRes = await db.execute({
    sql: `SELECT p.id, p.side, p.coins_bet, p.created_at,
                 m.id as market_id, m.title as market_title,
                 m.status as market_status, m.outcome as market_outcome,
                 m.market_type, m.yes_pool, m.no_pool
          FROM positions p
          JOIN markets m ON p.market_id = m.id
          WHERE p.user_id = ?
          ORDER BY p.created_at DESC
          LIMIT 50`,
    args: [uid],
  })
  const positions = posRes.rows as unknown as Array<{
    id: number; side: string; coins_bet: number; created_at: string
    market_id: number; market_title: string; market_status: string
    market_outcome: string | null; market_type: string
    yes_pool: number; no_pool: number
  }>

  // Stats
  const resolved = positions.filter(p => p.market_status === 'resolved')
  const wins = resolved.filter(p => p.market_outcome?.toUpperCase() === p.side.toUpperCase()).length
  const losses = resolved.length - wins
  const totalWagered = positions.reduce((s, p) => s + p.coins_bet, 0)

  const payoutRes = await db.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'payout'`,
    args: [uid],
  })
  const totalWon = (payoutRes.rows[0] as unknown as { total: number }).total

  return NextResponse.json({
    user: { ...user, rank },
    positions,
    stats: {
      totalBets: positions.length,
      totalWagered,
      totalWon,
      netProfit: totalWon - totalWagered,
      wins,
      losses,
    },
  })
}
