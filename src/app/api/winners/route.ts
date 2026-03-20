export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const res = await db.execute({
    sql: `SELECT year, month, user_name, coins, recorded_at FROM monthly_winners ORDER BY year DESC, month DESC`,
    args: [],
  })
  return NextResponse.json(res.rows)
}
