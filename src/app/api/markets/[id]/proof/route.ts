import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import fs from 'fs'
import path from 'path'
import { Market } from '@/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const marketId = Number(id)

  const market = db.prepare('SELECT creator_id, status FROM markets WHERE id = ?').get(marketId) as Pick<Market, 'creator_id' | 'status'> | undefined
  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  if (market.status !== 'resolved') return NextResponse.json({ error: 'Market is not resolved yet' }, { status: 400 })

  const userId = Number(session.sub)
  const isCreator = market.creator_id === userId
  const userRow = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(userId) as { is_admin: number } | undefined
  const isAdmin = !!userRow?.is_admin

  if (!isCreator && !isAdmin) {
    return NextResponse.json({ error: 'Only the market creator or an admin can upload proof' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const maxSize = 5 * 1024 * 1024 // 5 MB
  if (file.size > maxSize) return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or GIF images are allowed' }, { status: 400 })
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
  const filename = `market-${marketId}-${Date.now()}.${ext}`
  const filePath = path.join(process.cwd(), 'public', 'proofs', filename)

  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(filePath, buffer)

  const proofUrl = `/proofs/${filename}`
  db.prepare('UPDATE markets SET resolution_proof = ? WHERE id = ?').run(proofUrl, marketId)

  return NextResponse.json({ proof_url: proofUrl })
}
