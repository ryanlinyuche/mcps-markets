export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { commentId } = await params
  const cId = Number(commentId)
  const userId = Number(session.sub)

  const existing = await db.execute({ sql: 'SELECT 1 FROM comment_likes WHERE user_id = ? AND comment_id = ?', args: [userId, cId] })
  if (existing.rows[0]) {
    await db.execute({ sql: 'DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?', args: [userId, cId] })
    return NextResponse.json({ liked: false })
  } else {
    await db.execute({ sql: 'INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)', args: [userId, cId] })
    return NextResponse.json({ liked: true })
  }
}
