import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { computeOdds } from '@/lib/market-math'
import { Market, User, Position, OptionPool } from '@/types'
import { MarketPageClient } from '@/components/markets/MarketPageClient'
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
    comments_restricted: market.comments_restricted ?? null,
  }

  const similarRes = await db.execute({
    sql: `SELECT m.id, m.title, m.status, m.market_type, m.yes_pool, m.no_pool
          FROM markets m
          WHERE m.id != ? AND m.status = 'open'
            AND (m.market_type = ? OR m.school = ?)
          ORDER BY m.created_at DESC LIMIT 5`,
    args: [marketId, market.market_type, market.school],
  })
  const similarMarkets = (similarRes.rows as unknown as { id: number; title: string; status: string; market_type: string; yes_pool: number; no_pool: number }[]).map(m => {
    const total = m.yes_pool + m.no_pool
    return { ...m, yes_price: total === 0 ? 0.5 : m.yes_pool / total, no_price: total === 0 ? 0.5 : m.no_pool / total }
  })

  const isPastClose = market.status === 'open' && !!market.closes_at && new Date(market.closes_at) <= new Date()
  const displayStatus = isPastClose ? 'closed' : market.status
  const statusBadge = isPastClose
    ? 'bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-500/30'
    : ({
        open: 'bg-green-100 dark:bg-sky-500/15 text-green-700 dark:text-sky-400 border border-green-200 dark:border-sky-500/30',
        pending_approval: 'bg-yellow-100 dark:bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/30',
        pending_resolution: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30',
        resolved: 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30',
        rejected: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30',
      }[market.status] || 'bg-muted text-muted-foreground')

  return (
    <div className="space-y-5">
      <div>
        <Link href="/markets" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={14} /> Back to markets
        </Link>
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-2xl font-bold flex-1 leading-tight">{market.title}</h1>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusBadge}`}>
            {displayStatus === 'closed' ? 'Closed'
              : market.status === 'pending_approval' ? 'Pending'
              : market.status === 'pending_resolution' ? 'Resolving'
              : market.status.charAt(0).toUpperCase() + market.status.slice(1)}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {market.market_type === 'score' && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-sky-500/15 text-blue-700 dark:text-sky-400 border border-blue-200 dark:border-sky-500/30">Class Score</span>
          )}
          {market.market_type === 'personal_score' && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">📊 {market.subject_name}</span>
          )}
          {market.market_type === 'sat_act' && market.sport && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-blue-500/15 text-indigo-700 dark:text-blue-400 border border-indigo-200 dark:border-blue-500/30">📝 {market.sport}</span>
          )}
        </div>
        {market.description && <p className="text-muted-foreground text-sm mt-2">{market.description}</p>}
        <p className="text-xs text-muted-foreground mt-2">
          by {market.creator_name}
          {market.closes_at && ` · Closes ${new Date(market.closes_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`}
          {' · '}<Link href={`/schools/${encodeURIComponent(market.school)}`} className="hover:underline">{market.school}</Link>
        </p>
      </div>

      <MarketPageClient
        initialMarket={enrichedMarket}
        userBalance={userBalance}
        initialOptionPools={optionPools}
        initialHistory={history}
        userPositions={userPositions}
        similarMarkets={similarMarkets}
        isLoggedIn={!!session}
        isCreator={!!session && Number(session.sub) === market.creator_id}
        isAdmin={!!session?.isAdmin}
        commentsRestricted={market.comments_restricted === 1}
      />
    </div>
  )
}
