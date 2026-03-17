import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { User } from '@/types'

export async function GET() {
  const res = await db.execute({
    sql: 'SELECT id, name, balance, created_at FROM users ORDER BY balance DESC LIMIT 50',
    args: [],
  })
  return NextResponse.json(res.rows as unknown as Pick<User, 'id' | 'name' | 'balance' | 'created_at'>[])
}
