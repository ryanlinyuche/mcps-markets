export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const mRes = await db.execute({ sql: 'SELECT comments_restricted FROM markets WHERE id = ?', args: [Number(id)] })
  const m = mRes.rows[0] as unknown as { comments_restricted: number } | undefined
  if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const newVal = m.comments_restricted ? 0 : 1
  await db.execute({ sql: 'UPDATE markets SET comments_restricted = ? WHERE id = ?', args: [newVal, Number(id)] })
  return NextResponse.json({ comments_restricted: newVal })
}
