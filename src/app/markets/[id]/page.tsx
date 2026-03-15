import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { computeOdds } from '@/lib/market-math'
import { Market, User, Position } from '@/types'
import { OddsDisplay } from '@/components/markets/OddsDisplay'
import { BettingPanel } from '@/components/markets/BettingPanel'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

  const market = db.prepare(`
    SELECT m.*, u.name as creator_name
    FROM markets m
    JOIN users u ON m.creator_id = u.id
    WHERE m.id = ?
  `).get(Number(id)) as (Market & { creator_name: string }) | undefined

  if (!market) notFound()

  const { yesPrice, noPrice } = computeOdds(market.yes_pool, market.no_pool)
  const enrichedMarket = { ...market, yes_price: yesPrice, no_price: noPrice }

  let userBalance = 0
  let userPositions: Position[] = []

  if (session) {
    const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(Number(session.sub)) as Pick<User, 'balance'> | undefined
    userBalance = user?.balance ?? 0
    userPositions = db.prepare(
      'SELECT * FROM positions WHERE user_id = ? AND market_id = ?'
    ).all(Number(session.sub), Number(id)) as Position[]
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
        {market.description && (
          <p className="text-muted-foreground text-sm">{market.description}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Submitted by {market.creator_name}
          {market.closes_at && ` · Closes ${new Date(market.closes_at).toLocaleDateString()}`}
        </p>
      </div>

      <OddsDisplay
        yesPrice={yesPrice}
        noPrice={noPrice}
        yesPool={market.yes_pool}
        noPool={market.no_pool}
      />

      {market.status === 'resolved' && market.outcome && (
        <div className={`rounded-lg p-4 text-center font-semibold text-lg ${market.outcome === 'YES' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          Resolved: {market.outcome}
        </div>
      )}

      {session && <BettingPanel market={enrichedMarket} userBalance={userBalance} />}

      {userPositions.length > 0 && (
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-sm">Your Positions</h3>
          {userPositions.map(pos => (
            <div key={pos.id} className="flex justify-between items-center text-sm">
              <span className={pos.side === 'YES' ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
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
