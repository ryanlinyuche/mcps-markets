import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { Transaction } from '@/types'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const transactions = db.prepare(`
    SELECT t.*, m.title as market_title
    FROM transactions t
    LEFT JOIN markets m ON t.market_id = m.id
    WHERE t.user_id = ?
    ORDER BY t.created_at DESC
    LIMIT 100
  `).all(Number(session.sub)) as (Transaction & { market_title: string | null })[]

  return NextResponse.json(transactions)
}
