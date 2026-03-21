export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 1) return NextResponse.json({ markets: [], users: [] })

  const like = `%${q}%`

  // Search markets by title, school, sport, period_class, creator_name, subject_name
  const marketsRes = await db.execute({
    sql: `SELECT m.id, m.title, m.status, m.market_type, m.school, m.sport,
                 m.period_class, m.score_subtype, m.score_threshold,
                 m.closes_at, m.yes_pool, m.no_pool,
                 u.name as creator_name, su.name as subject_name
          FROM markets m
          JOIN users u ON m.creator_id = u.id
          LEFT JOIN users su ON m.subject_user_id = su.id
          WHERE m.status NOT IN ('rejected')
            AND (
              m.title LIKE ?
              OR m.school LIKE ?
              OR m.sport LIKE ?
              OR m.period_class LIKE ?
              OR m.description LIKE ?
              OR u.name LIKE ?
              OR su.name LIKE ?
            )
          ORDER BY m.created_at DESC
          LIMIT 20`,
    args: [like, like, like, like, like, like, like],
  })

  // Search users by name
  const usersRes = await db.execute({
    sql: `SELECT id, name, balance FROM users WHERE name LIKE ? LIMIT 10`,
    args: [like],
  })

  return NextResponse.json({
    markets: marketsRes.rows,
    users: usersRes.rows,
  })
}
