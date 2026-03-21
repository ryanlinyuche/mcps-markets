import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { computeOdds } from '@/lib/market-math'
import { Market, User, Position, OptionPool } from '@/types'
import { MarketLive } from '@/components/markets/MarketLive'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  const marketId = Number(id)

  const marketRes = await db.execute({
    sql: `SELECT m.*, u.name as creator_name, su.name as subject_name
          FROM markets m
          JOIN users u ON m.creator_id = u.id
          LEFT JOIN users su ON m.subject_user_id = su.id
          WHERE m.id = ?`,
    args: [marketId],
  })
  const market = marketRes.rows[0] as unknown as (Market & { creator_name: string; subject_name: string | null }) | undefined
  if (!market) notFound()

  const { yesPrice, noPrice } = computeOdds(market.yes_pool, market.no_pool)

  let optionPools: OptionPool[] | undefined
  if (market.market_type === 'score' || market.market_type === 'personal_score') {
    const optsRes = await db.execute({ sql: 'SELECT * FROM option_pools WHERE market_id = ? ORDER BY sort_order', args: [marketId] })
    optionPools = optsRes.rows as unknown as OptionPool[]
  }

  let history: { yes_pool: number; no_pool: number; recorded_at: string }[] = []
  if (market.market_type === 'yesno' || market.market_type === 'sports') {
    const histRes = await db.execute({
      sql: 'SELECT yes_pool, no_pool, recorded_at FROM market_history WHERE market_id = ? ORDER BY recorded_at ASC LIMIT 60',
      args: [marketId],
    })
    history = histRes.rows as unknown as { yes_pool: number; no_pool: number; recorded_at: string }[]
  }

  const flagRes = await db.execute({ sql: 'SELECT COUNT(*) as count FROM resolution_flags WHERE market_id = ?', args: [marketId] })
  const flagCount = (flagRes.rows[0] as unknown as { count: number }).count

  let userBalance = 0
  let userPositions: Position[] = []
  let userFlagged = false

  if (session) {
    const userRes = await db.execute({ sql: 'SELECT balance FROM users WHERE id = ?', args: [Number(session.sub)] })
    userBalance = (userRes.rows[0] as unknown as Pick<User, 'balance'> | undefined)?.balance ?? 0
    const posRes = await db.execute({
      sql: 'SELECT * FROM positions WHERE user_id = ? AND market_id = ?',
      args: [Number(session.sub), marketId],
    })
    userPositions = posRes.rows as unknown as Position[]
    const flaggedRes = await db.execute({
      sql: 'SELECT 1 FROM resolution_flags WHERE user_id = ? AND market_id = ?',
      args: [Number(session.sub), marketId],
    })
    userFlagged = !!flaggedRes.rows[0]
  }

  let resolvedByName: string | null = null
  if (market.resolved_by) {
    const resolverRes = await db.execute({ sql: 'SELECT name FROM users WHERE id = ?', args: [market.resolved_by] })
    resolvedByName = (resolverRes.rows[0] as unknown as { name: string } | undefined)?.name ?? null
  }

  const enrichedMarket: Market = {
    ...market,
    yes_price: yesPrice,
    no_price: noPrice,
    flag_count: flagCount,
    user_flagged: userFlagged,
    resolved_by_name: resolvedByName,
    subject_name: market.subject_name ?? null,
  }

  const statusBadge = {
    open: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
    pending_approval: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    pending_resolution: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    resolved: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    rejected: 'bg-red-500/15 text-red-400 border border-red-500/30',
  }[market.status] || 'bg-muted text-muted-foreground'

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Link href="/markets" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to markets
      </Link>

      {/* Title area */}
      <div className="space-y-2">
        <div className="flex items-start gap-2 flex-wrap">
          <h1 className="text-2xl font-bold flex-1 leading-tight">{market.title}</h1>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusBadge}`}>
            {market.status === 'pending_approval' ? 'Pending' : market.status === 'pending_resolution' ? 'Resolving' : market.status.charAt(0).toUpperCase() + market.status.slice(1)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {market.market_type === 'score' && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
              Class Score Market
            </span>
          )}
          {market.market_type === 'personal_score' && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
              📊 {market.subject_name ?? 'Personal Score'}
            </span>
          )}
          {market.market_type === 'sat_act' && market.sport && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
              📝 {market.sport}
            </span>
          )}
        </div>
        {market.description && (
          <p className="text-muted-foreground text-sm">{market.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          by {market.creator_name}
          {market.closes_at && ` · Closes ${new Date(market.closes_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`}
          {' · '}<Link href={`/schools/${encodeURIComponent(market.school)}`} className="hover:text-foreground transition-colors">{market.school}</Link>
        </p>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left: chart + resolution info */}
        <div className="flex-1 min-w-0 space-y-4">
          <MarketLive
            initialMarket={enrichedMarket}
            userBalance={userBalance}
            initialOptionPools={optionPools}
            initialHistory={history}
            isLoggedIn={!!session}
            isCreator={!!session && Number(session.sub) === market.creator_id}
            isAdmin={!!session?.isAdmin}
          />
        </div>

        {/* Right: positions */}
        {userPositions.length > 0 && (
          <div className="lg:w-72 w-full">
            <div className="rounded-2xl border border-white/8 bg-card p-4 space-y-3 lg:sticky lg:top-20">
              <h3 className="font-semibold text-sm">Your Positions</h3>
              {userPositions.map(pos => (
                <div key={pos.id} className="flex justify-between items-center text-sm rounded-xl bg-white/4 px-3 py-2">
                  <span className={
                    pos.side === 'YES' ? 'text-sky-400 font-semibold' :
                    pos.side === 'NO' ? 'text-orange-400 font-semibold' :
                    'font-semibold text-purple-400'
                  }>
                    {pos.side}
                  </span>
                  <CoinDisplay amount={pos.coins_bet} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
