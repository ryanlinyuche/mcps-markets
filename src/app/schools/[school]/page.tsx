import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { computeOdds } from '@/lib/market-math'
import { Market } from '@/types'
import { MarketCard } from '@/components/markets/MarketCard'
import { School, TrendingUp, Users, PlusCircle, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SchoolPage({ params }: { params: { school: string } }) {
  const schoolName = decodeURIComponent(params.school)

  const statsRes = await db.execute({
    sql: `
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') AS open_markets,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_markets,
        COALESCE(SUM(yes_pool + no_pool), 0) AS total_volume
      FROM markets
      WHERE school = ? AND status != 'rejected'
    `,
    args: [schoolName],
  })
  const stats = statsRes.rows[0] as unknown as { open_markets: number; resolved_markets: number; total_volume: number } | undefined

  if (!stats) notFound()

  const marketsRes = await db.execute({
    sql: `
      SELECT m.*, u.name as creator_name
      FROM markets m
      JOIN users u ON m.creator_id = u.id
      WHERE m.school = ? AND m.status = 'open'
      ORDER BY m.created_at DESC
    `,
    args: [schoolName],
  })
  const markets = marketsRes.rows as unknown as (Market & { creator_name: string })[]

  const enriched = markets.map(m => {
    const { yesPrice, noPrice } = computeOdds(m.yes_pool, m.no_pool)
    return { ...m, yes_price: yesPrice, no_price: noPrice }
  })

  const resolvedRes = await db.execute({
    sql: `
      SELECT m.*, u.name as creator_name
      FROM markets m
      JOIN users u ON m.creator_id = u.id
      WHERE m.school = ? AND m.status = 'resolved'
      ORDER BY m.resolved_at DESC
      LIMIT 5
    `,
    args: [schoolName],
  })
  const resolved = resolvedRes.rows as unknown as (Market & { creator_name: string })[]

  return (
    <div className="space-y-6">
      <Link href="/schools" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> All Schools
      </Link>

      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
          <School size={28} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-tight">{schoolName}</h1>
          <div className="flex items-center gap-5 mt-2 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <TrendingUp size={14} />
              {stats.open_markets} open market{stats.open_markets !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={14} />
              {stats.total_volume.toLocaleString()} coins wagered
            </span>
            {stats.resolved_markets > 0 && (
              <span className="text-xs">
                {stats.resolved_markets} resolved
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/markets/submit`}
          className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
          <PlusCircle size={15} />
          Submit Market
        </Link>
      </div>

      {/* Open Markets */}
      <div>
        <h2 className="text-base font-semibold mb-3">
          Open Markets
          <span className="text-muted-foreground font-normal text-sm ml-2">({enriched.length})</span>
        </h2>
        {enriched.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <p>No open markets for this school yet.</p>
            <p className="text-sm mt-1">
              <Link href="/markets/submit" className="underline">Submit the first one!</Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enriched.map(market => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </div>

      {/* Recently Resolved */}
      {resolved.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Recently Resolved</h2>
          <div className="space-y-2">
            {resolved.map(m => (
              <Link key={m.id} href={`/markets/${m.id}`}>
                <div className="rounded-lg border p-3 hover:bg-muted/50 transition-colors flex justify-between items-center gap-3">
                  <p className="text-sm font-medium leading-snug truncate">{m.title}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    m.outcome === 'YES' ? 'bg-green-100 text-green-700' :
                    m.outcome === 'NO' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {m.outcome}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
