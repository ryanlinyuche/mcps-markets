'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Trophy, TrendingUp, TrendingDown, Coins, Loader2 } from 'lucide-react'
import { CoinDisplay } from '@/components/shared/CoinDisplay'

interface ProfileData {
  user: {
    id: number
    name: string
    balance: number
    rank: number
    created_at: string
  }
  positions: Array<{
    id: number
    side: string
    coins_bet: number
    created_at: string
    market_id: number
    market_title: string
    market_status: string
    market_outcome: string | null
    market_type: string
  }>
  stats: {
    totalBets: number
    totalWagered: number
    totalWon: number
    netProfit: number
    wins: number
    losses: number
  }
}

export default function PublicProfilePage() {
  const params = useParams()
  const userId = params.userId as string
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/profile/${userId}`)
      .then(r => r.ok ? r.json() : r.json().then((e: { error: string }) => { throw new Error(e.error) }))
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 size={28} className="animate-spin text-muted-foreground" />
    </div>
  )

  if (error || !data) return (
    <div className="text-center py-20 text-muted-foreground">
      <p className="text-4xl mb-3">👤</p>
      <p className="font-medium">{error || 'User not found'}</p>
    </div>
  )

  const { user, positions, stats } = data
  const initial = user.name.charAt(0).toUpperCase()
  const open = positions.filter(p => p.market_status === 'open')
  const resolved = positions.filter(p => p.market_status === 'resolved')
  const netPositive = stats.netProfit >= 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-2xl font-bold text-primary">
            {initial}
          </div>
          <div>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-sm text-muted-foreground">Rank #{user.rank} · joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
          </div>
          <div className="ml-auto text-right">
            <CoinDisplay amount={user.balance} size="lg" />
            <p className="text-xs text-muted-foreground mt-0.5">balance</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Bets',  value: stats.totalBets, icon: Coins, color: '' },
          { label: 'Win / Loss',  value: `${stats.wins} / ${stats.losses}`, icon: Trophy, color: 'text-amber-500' },
          { label: 'Wagered',     value: `${stats.totalWagered.toLocaleString()} c`, icon: TrendingDown, color: 'text-red-500' },
          { label: 'Net Profit',  value: `${netPositive ? '+' : ''}${stats.netProfit.toLocaleString()} c`, icon: netPositive ? TrendingUp : TrendingDown, color: netPositive ? 'text-green-600 dark:text-emerald-400' : 'text-red-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
            <Icon size={16} className={`mx-auto mb-1.5 ${color || 'text-muted-foreground'}`} />
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Open positions */}
      {open.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm">Active Bets ({open.length})</h2>
          </div>
          {open.map(p => (
            <Link
              key={p.id}
              href={`/markets/${p.market_id}`}
              className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.market_title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Betting <span className={`font-semibold ${p.side === 'yes' || p.side === 'YES' ? 'text-sky-500' : 'text-orange-500'}`}>{p.side.toUpperCase()}</span>
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums ml-3 shrink-0">{p.coins_bet.toLocaleString()} c</span>
            </Link>
          ))}
        </div>
      )}

      {/* Resolved positions */}
      {resolved.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm">Resolved Bets ({resolved.length})</h2>
          </div>
          {resolved.map(p => {
            const won = p.market_outcome?.toUpperCase() === p.side.toUpperCase()
            return (
              <Link
                key={p.id}
                href={`/markets/${p.market_id}`}
                className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.market_title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Bet <span className="font-medium">{p.side.toUpperCase()}</span>
                    {' · '}Resolved <span className="font-medium">{p.market_outcome}</span>
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-3 shrink-0 ${
                  won
                    ? 'bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                    : 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
                }`}>
                  {won ? '✓ Won' : '✗ Lost'}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {positions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-3xl mb-2">🎯</p>
          <p className="font-medium">No bets yet</p>
        </div>
      )}
    </div>
  )
}
