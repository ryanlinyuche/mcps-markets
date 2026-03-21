export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export interface ActivityItem {
  id: number
  user_id: number
  user_name: string
  type: 'bet_placed' | 'payout' | 'refund' | 'signup_bonus'
  amount: number
  description: string | null
  market_id: number | null
  market_title: string | null
  market_type: string | null
  side: string | null
  created_at: string
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? '60'), 100)
  const offset = Number(searchParams.get('offset') ?? '0')

  const res = await db.execute({
    sql: `
      SELECT
        t.id,
        t.user_id,
        u.name AS user_name,
        t.type,
        t.amount,
        t.description,
        t.market_id,
        m.title AS market_title,
        m.market_type,
        p.side,
        t.created_at
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN markets m ON t.market_id = m.id
      LEFT JOIN positions p ON p.market_id = t.market_id AND p.user_id = t.user_id
      WHERE t.type IN ('bet_placed', 'payout', 'refund')
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `,
    args: [limit, offset],
  })

  return NextResponse.json(res.rows)
}
