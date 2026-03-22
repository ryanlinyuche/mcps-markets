export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const marketId = Number(id)
  const mRes = await db.execute({ sql: 'SELECT id FROM markets WHERE id = ?', args: [marketId] })
  if (!mRes.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Must be an image' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Max 5MB' }, { status: 400 })
  const ext = file.name.split('.').pop() ?? 'jpg'
  const blob = await put(`proof/admin-update-${marketId}-${Date.now()}.${ext}`, file, { access: 'public' })
  await db.execute({ sql: 'UPDATE markets SET resolution_proof = ? WHERE id = ?', args: [blob.url, marketId] })
  return NextResponse.json({ url: blob.url })
}
