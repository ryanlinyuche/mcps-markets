export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const [usersRes, submittersRes] = await Promise.all([
    // Top 3 users by balance who have placed at least 1 bet
    db.execute({
      sql: `SELECT u.id, u.name, u.balance
            FROM users u
            WHERE EXISTS (SELECT 1 FROM positions p WHERE p.user_id = u.id)
            ORDER BY u.balance DESC
            LIMIT 3`,
      args: [],
    }),
    // Top 3 market submitters (approved + open + resolved markets)
    db.execute({
      sql: `SELECT u.id, u.name, COUNT(*) as market_count
            FROM markets m
            JOIN users u ON u.id = m.creator_id
            WHERE m.status NOT IN ('rejected', 'pending_approval')
            GROUP BY u.id, u.name
            ORDER BY market_count DESC
            LIMIT 3`,
      args: [],
    }),
  ])

  return NextResponse.json({
    topUsers: usersRes.rows,
    topSubmitters: submittersRes.rows,
  })
}
