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

// Regenerate invite code
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const bubbleId = Number(id)
  const userId = Number(session.sub)

  const adminCheck = await db.execute({
    sql: `SELECT role FROM bubble_members WHERE bubble_id = ? AND user_id = ?`,
    args: [bubbleId, userId],
  })
  const role = (adminCheck.rows[0] as unknown as { role: string } | undefined)?.role
  if (role !== 'admin' && !session.isAdmin) {
    return NextResponse.json({ error: 'Only the bubble admin can regenerate the invite link' }, { status: 403 })
  }

  let code = generateInviteCode()
  for (let i = 0; i < 5; i++) {
    const check = await db.execute({ sql: 'SELECT 1 FROM bubbles WHERE invite_code = ?', args: [code] })
    if (!check.rows[0]) break
    code = generateInviteCode()
  }

  await db.execute({ sql: 'UPDATE bubbles SET invite_code = ? WHERE id = ?', args: [code, bubbleId] })
  return NextResponse.json({ invite_code: code })
}
