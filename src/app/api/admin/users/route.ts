export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { User } from '@/types'

export async function GET() {
  const res = await db.execute({
    sql: 'SELECT id, name, student_id, balance, is_admin, created_at FROM users ORDER BY balance DESC',
    args: [],
  })
  return NextResponse.json(res.rows as unknown as User[])
}
