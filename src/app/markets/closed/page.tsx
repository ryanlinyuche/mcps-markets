export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { computeOdds } from '@/lib/market-math'
import { Market, OptionPool } from '@/types'
import { MarketCard } from '@/components/markets/MarketCard'

async function fetchMarkets() {
  const res = await db.execute({
    sql: `SELECT m.*, u.name as creator_name, su.name as subject_name
          FROM markets m
          JOIN users u ON m.creator_id = u.id
          LEFT JOIN users su ON m.subject_user_id = su.id
          WHERE (m.status = 'open' AND m.closes_at IS NOT NULL AND datetime(m.closes_at) <= datetime('now'))
             OR m.status = 'pending_resolution'
          ORDER BY m.closes_at DESC`,
    args: [],
  })
  const markets = res.rows as unknown as (Market & { creator_name: string; subject_name: string | null })[]
  const enriched = markets.map(m => {
    const { yesPrice, noPrice } = computeOdds(m.yes_pool, m.no_pool)
    return { ...m, yes_price: yesPrice, no_price: noPrice }
  })
  const scoreIds = enriched.filter(m => m.market_type === 'score' || m.market_type === 'personal_score').map(m => m.id)
  const optionsByMarket: Record<number, OptionPool[]> = {}
  if (scoreIds.length > 0) {
    const optsRes = await db.execute({
      sql: `SELECT * FROM option_pools WHERE market_id IN (${scoreIds.map(() => '?').join(',')}) ORDER BY sort_order`,
      args: scoreIds,
    })
    for (const opt of optsRes.rows as unknown as OptionPool[]) {
      if (!optionsByMarket[opt.market_id]) optionsByMarket[opt.market_id] = []
      optionsByMarket[opt.market_id].push(opt)
    }
  }
  return enriched.map(m => ({
    ...m,
    option_pools: (m.market_type === 'score' || m.market_type === 'personal_score') ? (optionsByMarket[m.id] ?? []) : undefined,
  }))
}

export default async function ClosedMarketsPage() {
  const markets = await fetchMarkets()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Closed Markets</h1>
        <p className="text-sm text-muted-foreground">Betting has closed — awaiting resolution</p>
      </div>
      {markets.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">No closed markets awaiting resolution.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {markets.map(m => <MarketCard key={m.id} market={m} />)}
        </div>
      )}
    </div>
  )
}
