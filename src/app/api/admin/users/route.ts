export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { User } from '@/types'

export async function GET() {
  const res = await db.execute({
    sql: 'SELECT id, name, student_id, balance, is_admin, created_at FROM users ORDER BY balance DESC',
    args: [],
  })
  return NextResponse.json(res.rows as unknown as User[])
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { student_id, is_admin } = await request.json()
  if (!student_id) return NextResponse.json({ error: 'student_id required' }, { status: 400 })

  await db.execute({
    sql: 'UPDATE users SET is_admin = ? WHERE student_id = ?',
    args: [is_admin ? 1 : 0, String(student_id)],
  })
  return NextResponse.json({ success: true })
}
