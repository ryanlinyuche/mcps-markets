export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const marketId = Number(id)
  const session = await getSession()
  const userId = session ? Number(session.sub) : null

  const res = await db.execute({
    sql: `SELECT c.id, c.parent_id, c.content, c.created_at,
                 u.id as user_id, u.name as user_name,
                 COUNT(cl.user_id) as like_count,
                 MAX(CASE WHEN cl.user_id = ? THEN 1 ELSE 0 END) as user_liked
          FROM comments c
          JOIN users u ON c.user_id = u.id
          LEFT JOIN comment_likes cl ON cl.comment_id = c.id
          WHERE c.market_id = ?
          GROUP BY c.id
          ORDER BY c.created_at ASC`,
    args: [userId ?? 0, marketId],
  })
  return NextResponse.json(res.rows)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const marketId = Number(id)
  const userId = Number(session.sub)

  // Check user not banned
  const userRes = await db.execute({ sql: 'SELECT comments_banned FROM users WHERE id = ?', args: [userId] })
  const user = userRes.rows[0] as unknown as { comments_banned: number } | undefined
  if (user?.comments_banned) return NextResponse.json({ error: 'You are banned from commenting' }, { status: 403 })

  // Check market comments not restricted (unless admin)
  const mRes = await db.execute({ sql: 'SELECT comments_restricted FROM markets WHERE id = ?', args: [marketId] })
  const market = mRes.rows[0] as unknown as { comments_restricted: number } | undefined
  if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  if (market.comments_restricted && !session.isAdmin) return NextResponse.json({ error: 'Comments are restricted on this market' }, { status: 403 })

  const { content, parent_id } = await req.json()
  if (!content?.trim() || content.trim().length > 500) return NextResponse.json({ error: 'Comment must be 1–500 characters' }, { status: 400 })

  const insertRes = await db.execute({
    sql: 'INSERT INTO comments (market_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
    args: [marketId, userId, parent_id ?? null, content.trim()],
  })
  return NextResponse.json({ id: insertRes.lastInsertRowid, success: true })
}
