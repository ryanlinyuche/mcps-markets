import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await db.execute({
    sql: `UPDATE users SET rules_accepted_at = datetime('now') WHERE id = ?`,
    args: [Number(session.sub)],
  })
  return NextResponse.json({ ok: true })
}
