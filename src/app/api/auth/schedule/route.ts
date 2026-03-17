import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { ClassPeriod } from '@/types'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const periods = db.prepare(`
    SELECT period, course_title, teacher, room, course_code
    FROM user_schedule
    WHERE user_id = ?
    ORDER BY CAST(period AS INTEGER)
  `).all(Number(session.sub)) as ClassPeriod[]

  return NextResponse.json(periods)
}
