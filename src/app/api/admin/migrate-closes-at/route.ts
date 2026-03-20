export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

// One-time migration: existing markets had closes_at stored as local ET time
// (e.g. "2026-03-19T23:59") instead of UTC. This converts them to UTC by
// adding 4 hours (EDT = UTC-4, active in Maryland during March–November).
// Safe to run multiple times — only updates rows still containing 'T'.
export async function POST() {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const affected = await db.execute({
    sql: `SELECT id, title, closes_at FROM markets WHERE closes_at LIKE '%T%'`,
    args: [],
  })

  if (affected.rows.length === 0) {
    return NextResponse.json({ message: 'No markets needed migration', updated: 0 })
  }

  await db.execute({
    sql: `UPDATE markets
          SET closes_at = strftime('%Y-%m-%d %H:%M:%S', closes_at, '+4 hours')
          WHERE closes_at LIKE '%T%'`,
    args: [],
  })

  return NextResponse.json({
    message: `Migrated ${affected.rows.length} market(s) from ET local time to UTC`,
    updated: affected.rows.length,
    markets: affected.rows.map(r => ({ id: r.id, title: r.title, old_closes_at: r.closes_at })),
  })
}
