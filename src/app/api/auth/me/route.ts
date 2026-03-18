export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { User } from '@/types'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [Number(session.sub)] })
  const user = res.rows[0] as unknown as User | undefined
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    balance: user.balance,
    isAdmin: user.is_admin === 1,
  })
}
