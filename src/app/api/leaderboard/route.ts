import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { User } from '@/types'

export async function GET() {
  const users = db.prepare(
    'SELECT id, name, balance, created_at FROM users ORDER BY balance DESC LIMIT 50'
  ).all() as Pick<User, 'id' | 'name' | 'balance' | 'created_at'>[]

  return NextResponse.json(users)
}
