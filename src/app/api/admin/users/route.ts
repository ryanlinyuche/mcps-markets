import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { User } from '@/types'

export async function GET() {
  const users = db.prepare(
    'SELECT id, name, student_id, balance, is_admin, created_at FROM users ORDER BY balance DESC'
  ).all() as User[]

  return NextResponse.json(users)
}
