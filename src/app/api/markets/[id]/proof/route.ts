import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { Market } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const marketId = Number(id)

  const marketRes = await db.execute({ sql: 'SELECT creator_id, status FROM markets WHERE id = ?', args: [marketId] })
  const market = marketRes.rows[0] as unknown as Pick<Market, 'creator_id' | 'status'> | undefined
  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  if (market.status !== 'resolved') return NextResponse.json({ error: 'Market is not resolved yet' }, { status: 400 })

  const userId = Number(session.sub)
  const isCreator = market.creator_id === userId
  const userRes = await db.execute({ sql: 'SELECT is_admin FROM users WHERE id = ?', args: [userId] })
  const userRow = userRes.rows[0] as unknown as { is_admin: number } | undefined
  const isAdmin = !!userRow?.is_admin

  if (!isCreator && !isAdmin) {
    return NextResponse.json({ error: 'Only the market creator or an admin can upload proof' }, { status: 403 })
  }

  // File uploads require persistent storage — not supported on Vercel serverless
  return NextResponse.json({ error: 'Proof upload requires persistent storage. Use Railway or Fly.io instead.' }, { status: 501 })
}
