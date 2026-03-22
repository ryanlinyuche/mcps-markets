export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const uRes = await db.execute({ sql: 'SELECT comments_banned FROM users WHERE id = ?', args: [Number(id)] })
  const u = uRes.rows[0] as unknown as { comments_banned: number } | undefined
  if (!u) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const newVal = u.comments_banned ? 0 : 1
  await db.execute({ sql: 'UPDATE users SET comments_banned = ? WHERE id = ?', args: [newVal, Number(id)] })
  return NextResponse.json({ comments_banned: newVal })
}
