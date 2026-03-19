export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRes = await db.execute({ sql: 'SELECT is_admin FROM users WHERE id = ?', args: [Number(session.sub)] })
  const userRow = userRes.rows[0] as unknown as { is_admin: number } | undefined
  if (!userRow?.is_admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { id } = await params
  const marketId = Number(id)

  const marketRes = await db.execute({ sql: 'SELECT status FROM markets WHERE id = ?', args: [marketId] })
  const market = marketRes.rows[0] as unknown as { status: string } | undefined
  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  if (market.status !== 'pending_resolution') return NextResponse.json({ error: 'Market is not pending resolution' }, { status: 400 })

  await db.execute({
    sql: `UPDATE markets SET status = 'open', pending_outcome = NULL, resolution_proof = NULL, resolution_requested_by = NULL WHERE id = ?`,
    args: [marketId],
  })

  return NextResponse.json({ success: true })
}
