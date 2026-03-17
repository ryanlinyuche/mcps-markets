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
    open: 'bg-green-100 text-green-800',
    pending_approval: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-gray-100 text-gray-700',
    rejected: 'bg-red-100 text-red-700',
  }[market.status] || ''

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/markets" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to markets
      </Link>

      <div className="space-y-2">
        <div className="flex items-start gap-2 flex-wrap">
          <h1 className="text-xl font-bold flex-1">{market.title}</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge}`}>
            {market.status === 'pending_approval' ? 'Pending' : market.status.charAt(0).toUpperCase() + market.status.slice(1)}
          </span>
        </div>
        {market.market_type === 'score' && (
          <p className="text-xs font-medium text-blue-600 bg-blue-50 rounded px-2 py-0.5 w-fit">
            Test Score Market
          </p>
        )}
        {market.market_type === 'personal_score' && (
          <p className="text-xs font-medium text-purple-700 bg-purple-50 rounded px-2 py-0.5 w-fit">
            &#x1F4CA; Personal Score &mdash; {market.subject_name ?? 'Unknown'}
          </p>
        )}
        {market.description && (
          <p className="text-muted-foreground text-sm">{market.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Submitted by {market.creator_name}
          {market.closes_at && ` · Betting closes ${new Date(market.closes_at).toLocaleString('en-US')}`}
          {' · '}<Link href={`/schools/${encodeURIComponent(market.school)}`} className="hover:underline">{market.school}</Link>
        </p>
      </div>

      <MarketLive
        initialMarket={enrichedMarket}
        userBalance={userBalance}
        initialOptionPools={optionPools}
        initialHistory={history}
        isLoggedIn={!!session}
        isCreator={!!session && Number(session.sub) === market.creator_id}
        isAdmin={!!session?.isAdmin}
      />

      {userPositions.length > 0 && (
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-sm">Your Positions</h3>
          {userPositions.map(pos => (
            <div key={pos.id} className="flex justify-between items-center text-sm">
              <span className={
                pos.side === 'YES' ? 'text-green-600 font-medium' :
                pos.side === 'NO' ? 'text-red-500 font-medium' :
                'font-medium'
              }>
                {pos.side}
              </span>
              <CoinDisplay amount={pos.coins_bet} size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
