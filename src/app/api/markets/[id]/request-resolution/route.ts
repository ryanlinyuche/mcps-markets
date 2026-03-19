export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
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
  const userId = Number(session.sub)

  const marketRes = await db.execute({
    sql: 'SELECT creator_id, status, market_type FROM markets WHERE id = ?',
    args: [marketId],
  })
  const market = marketRes.rows[0] as unknown as Pick<Market, 'creator_id' | 'status' | 'market_type'> | undefined
  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  if (market.status !== 'open') return NextResponse.json({ error: 'Market must be open to request resolution' }, { status: 400 })

  const formData = await request.formData()
  const outcome = formData.get('outcome') as string | null
  const file = formData.get('file') as File | null

  if (!outcome) return NextResponse.json({ error: 'Outcome is required' }, { status: 400 })
  if (!file) return NextResponse.json({ error: 'Proof image is required' }, { status: 400 })

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
  }

  const blob = await put(`proof/${marketId}-${Date.now()}.${file.name.split('.').pop()}`, file, {
    access: 'public',
  })

  await db.execute({
    sql: `UPDATE markets SET status = 'pending_resolution', pending_outcome = ?, resolution_proof = ?, resolution_requested_by = ? WHERE id = ?`,
    args: [outcome, blob.url, userId, marketId],
  })

  return NextResponse.json({ success: true })
}
