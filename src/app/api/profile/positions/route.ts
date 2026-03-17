import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { Position } from '@/types'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await db.execute({
    sql: `SELECT p.*, m.title as market_title, m.status as market_status, m.outcome as market_outcome
          FROM positions p
          JOIN markets m ON p.market_id = m.id
          WHERE p.user_id = ?
          ORDER BY p.created_at DESC`,
    args: [Number(session.sub)],
  })

  return NextResponse.json(res.rows as unknown as (Position & { market_title: string; market_status: string; market_outcome: string | null })[])
}
