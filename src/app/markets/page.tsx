import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MarketCard } from '@/components/markets/MarketCard'
import { db } from '@/lib/db'
import { computeOdds } from '@/lib/market-math'
import { Market } from '@/types'
import { PlusCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function MarketsPage() {
  const markets = db.prepare(`
    SELECT m.*, u.name as creator_name
    FROM markets m
    JOIN users u ON m.creator_id = u.id
    WHERE m.status = 'open'
    ORDER BY m.created_at DESC
  `).all() as (Market & { creator_name: string })[]

  const enriched = markets.map(m => {
    const { yesPrice, noPrice } = computeOdds(m.yes_pool, m.no_pool)
    return { ...m, yes_price: yesPrice, no_price: noPrice }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Markets</h1>
          <p className="text-muted-foreground text-sm">{enriched.length} open markets</p>
        </div>
        <Link
          href="/markets/submit"
          className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <PlusCircle size={16} />
          Submit Market
        </Link>
      </div>

      {enriched.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No open markets yet.</p>
          <p className="text-sm mt-1">Submit one and the admin will review it!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enriched.map(market => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  )
}
