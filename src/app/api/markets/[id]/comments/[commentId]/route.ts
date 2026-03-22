export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { commentId } = await params
  const cId = Number(commentId)
  const commentRes = await db.execute({ sql: 'SELECT user_id FROM comments WHERE id = ?', args: [cId] })
  const comment = commentRes.rows[0] as unknown as { user_id: number } | undefined
  if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!session.isAdmin && comment.user_id !== Number(session.sub)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // Delete likes and the comment
  await db.execute({ sql: 'DELETE FROM comment_likes WHERE comment_id = ?', args: [cId] })
  // Delete child comments
  await db.execute({ sql: 'DELETE FROM comment_likes WHERE comment_id IN (SELECT id FROM comments WHERE parent_id = ?)', args: [cId] })
  await db.execute({ sql: 'DELETE FROM comments WHERE parent_id = ?', args: [cId] })
  await db.execute({ sql: 'DELETE FROM comments WHERE id = ?', args: [cId] })
  return NextResponse.json({ success: true })
}
