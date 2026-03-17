import Link from 'next/link'
import { MarketsListClient } from '@/components/markets/MarketsListClient'
import { db } from '@/lib/db'
import { computeOdds } from '@/lib/market-math'
import { Market, OptionPool } from '@/types'
import { PlusCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MarketsPage({ searchParams }: { searchParams: { school?: string } }) {
  const schoolFilter = searchParams.school

  const baseSql = `
    SELECT m.*, u.name as creator_name, su.name as subject_name
    FROM markets m
    JOIN users u ON m.creator_id = u.id
    LEFT JOIN users su ON m.subject_user_id = su.id
    WHERE m.status = 'open'
  `
  const marketsRes = schoolFilter
    ? await db.execute({ sql: baseSql + ' AND m.school = ? ORDER BY m.created_at DESC', args: [schoolFilter] })
    : await db.execute({ sql: baseSql + ' ORDER BY m.created_at DESC', args: [] })
  const markets = marketsRes.rows as unknown as (Market & { creator_name: string; subject_name: string | null })[]

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
  const withOptions = enriched.map(m => ({
    ...m,
    option_pools: (m.market_type === 'score' || m.market_type === 'personal_score') ? (optionsByMarket[m.id] ?? []) : undefined,
  }))

  const schoolsRes = await db.execute({
    sql: "SELECT DISTINCT school FROM markets WHERE status = 'open' ORDER BY school",
    args: [],
  })
  const schools = (schoolsRes.rows as unknown as { school: string }[]).map(r => r.school)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Markets</h1>
          <p className="text-muted-foreground text-sm">{enriched.length} open market{enriched.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/markets/submit"
          className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <PlusCircle size={16} />
          Submit Market
        </Link>
      </div>

      {schools.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/markets"
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!schoolFilter ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}
          >
            All Schools
          </Link>
          {schools.map(s => (
            <Link
              key={s}
              href={`/markets?school=${encodeURIComponent(s)}`}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${schoolFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}
            >
              {s}
            </Link>
          ))}
        </div>
      )}

      <MarketsListClient initialMarkets={withOptions} schoolFilter={schoolFilter} />
    </div>
  )
}
