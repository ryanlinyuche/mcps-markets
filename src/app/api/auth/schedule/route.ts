import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { ClassPeriod } from '@/types'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await db.execute({
    sql: `SELECT period, course_title, teacher, room, course_code
          FROM user_schedule WHERE user_id = ?
          ORDER BY CAST(period AS INTEGER)`,
    args: [Number(session.sub)],
  })

  return NextResponse.json(res.rows as unknown as ClassPeriod[])
}
