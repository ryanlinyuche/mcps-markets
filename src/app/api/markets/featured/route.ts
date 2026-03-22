export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeOdds } from '@/lib/market-math'

export async function GET() {
  const res = await db.execute({
    sql: `SELECT m.*, u.name as creator_name, fm.sort_order
          FROM featured_markets fm
          JOIN markets m ON fm.market_id = m.id
          JOIN users u ON m.creator_id = u.id
          WHERE m.status = 'open'
          ORDER BY fm.sort_order ASC
          LIMIT 5`,
    args: [],
  })
  const markets = (res.rows as unknown as Array<Record<string, unknown>>).map(m => {
    const { yesPrice, noPrice } = computeOdds(m.yes_pool as number, m.no_pool as number)
    return { ...m, yes_price: yesPrice, no_price: noPrice }
  })
  return NextResponse.json(markets)
}
