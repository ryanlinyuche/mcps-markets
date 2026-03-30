export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = Number(session.sub)

  const res = await db.execute({
    sql: `SELECT b.*, bm.balance as my_balance, bm.role as my_role,
                 (SELECT COUNT(*) FROM bubble_members bm2 WHERE bm2.bubble_id = b.id) as member_count
          FROM bubbles b
          JOIN bubble_members bm ON bm.bubble_id = b.id AND bm.user_id = ?
          ORDER BY b.created_at DESC`,
    args: [userId],
  })

  return NextResponse.json(res.rows)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = Number(session.sub)

  // One bubble per user
  const existingRes = await db.execute({
    sql: 'SELECT 1 FROM bubble_members WHERE user_id = ?',
    args: [userId],
  })
  if (existingRes.rows[0]) {
    return NextResponse.json({ error: 'You are already in a bubble. Leave it before creating a new one.' }, { status: 400 })
  }

  const { name, description, starting_balance } = await request.json()
  if (!name?.trim() || name.trim().length < 2) {
    return NextResponse.json({ error: 'Bubble name must be at least 2 characters' }, { status: 400 })
  }
  const balance = Math.max(1, Math.floor(Number(starting_balance) || 1000))

  let invite_code = generateInviteCode()
  // Retry on collision (extremely unlikely)
  for (let i = 0; i < 5; i++) {
    const check = await db.execute({ sql: 'SELECT 1 FROM bubbles WHERE invite_code = ?', args: [invite_code] })
    if (!check.rows[0]) break
    invite_code = generateInviteCode()
  }

  const insertRes = await db.execute({
    sql: `INSERT INTO bubbles (name, description, creator_id, invite_code, starting_balance) VALUES (?, ?, ?, ?, ?)`,
    args: [name.trim(), description?.trim() || null, userId, invite_code, balance],
  })
  const bubbleId = Number(insertRes.lastInsertRowid)

  // Add creator as admin member
  await db.execute({
    sql: `INSERT INTO bubble_members (bubble_id, user_id, balance, role) VALUES (?, ?, ?, 'admin')`,
    args: [bubbleId, userId, balance],
  })

  const bubble = await db.execute({ sql: 'SELECT * FROM bubbles WHERE id = ?', args: [bubbleId] })
  return NextResponse.json(bubble.rows[0], { status: 201 })
}
