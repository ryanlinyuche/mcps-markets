export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

// GET: validate invite code, return bubble info
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  const bubbleRes = await db.execute({
    sql: `SELECT b.*, (SELECT COUNT(*) FROM bubble_members bm WHERE bm.bubble_id = b.id) as member_count
          FROM bubbles b WHERE b.invite_code = ?`,
    args: [code],
  })
  if (!bubbleRes.rows[0]) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })

  return NextResponse.json(bubbleRes.rows[0])
}

// POST: join via invite code
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = Number(session.sub)
  const { code } = await request.json()
  if (!code) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  // One bubble per user
  const existingMember = await db.execute({
    sql: 'SELECT 1 FROM bubble_members WHERE user_id = ?',
    args: [userId],
  })
  if (existingMember.rows[0]) {
    return NextResponse.json({ error: 'You are already in a bubble. Leave it first.' }, { status: 400 })
  }

  const bubbleRes = await db.execute({
    sql: 'SELECT id, starting_balance FROM bubbles WHERE invite_code = ?',
    args: [code],
  })
  const bubble = bubbleRes.rows[0] as unknown as { id: number; starting_balance: number } | undefined
  if (!bubble) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })

  await db.execute({
    sql: `INSERT INTO bubble_members (bubble_id, user_id, balance, role) VALUES (?, ?, ?, 'member')`,
    args: [bubble.id, userId, bubble.starting_balance],
  })

  return NextResponse.json({ success: true, bubble_id: bubble.id })
}
