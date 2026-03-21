'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Activity, TrendingUp, Gift, RotateCcw, Loader2, RefreshCw } from 'lucide-react'

interface ActivityItem {
  id: number
  user_id: number
  user_name: string
  type: 'bet_placed' | 'payout' | 'refund' | 'signup_bonus'
  amount: number
  description: string | null
  market_id: number | null
  market_title: string | null
  market_type: string | null
  side: string | null
  created_at: string
}

const TYPE_CONFIG = {
  bet_placed: {
    icon: <TrendingUp size={15} />,
    color: 'text-sky-500 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-500/10',
    label: 'Bet',
    amountClass: 'text-red-600 dark:text-orange-400',
    prefix: '−',
  },
  payout: {
    icon: <Gift size={15} />,
    color: 'text-green-600 dark:text-emerald-400',
    bg: 'bg-green-50 dark:bg-emerald-500/10',
    label: 'Won',
    amountClass: 'text-green-600 dark:text-emerald-400',
    prefix: '+',
  },
  refund: {
    icon: <RotateCcw size={15} />,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    label: 'Refund',
    amountClass: 'text-amber-600 dark:text-amber-400',
    prefix: '+',
  },
  signup_bonus: {
    icon: <Gift size={15} />,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    label: 'Bonus',
    amountClass: 'text-purple-600 dark:text-purple-400',
    prefix: '+',
  },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function getSideLabel(side: string | null, market_type: string | null): string {
  if (!side) return ''
  if (side === 'yes') return 'YES'
  if (side === 'no') return 'NO'
  return side // letter grade or custom option
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.bet_placed

  return (
    <div className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors border-b border-border last:border-0">
      {/* Icon */}
      <div className={`mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${cfg.bg} ${cfg.color}`}>
        {cfg.icon}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-semibold text-foreground">{item.user_name}</span>
          {' '}
          {item.type === 'bet_placed' && item.side && (
            <>
              bet{' '}
              <span className={`font-semibold ${item.side === 'yes' ? 'text-sky-500 dark:text-sky-400' : 'text-orange-500 dark:text-orange-400'}`}>
                {getSideLabel(item.side, item.market_type)}
              </span>
              {' '}on{' '}
            </>
          )}
          {item.type === 'payout' && 'won from '}
          {item.type === 'refund' && 'got a refund from '}
          {item.market_id ? (
            <Link
              href={`/markets/${item.market_id}`}
              className="font-medium text-foreground hover:text-primary transition-colors underline underline-offset-2 decoration-border hover:decoration-primary"
            >
              {item.market_title ?? `Market #${item.market_id}`}
            </Link>
          ) : (
            <span className="text-muted-foreground">a market</span>
          )}
        </p>

        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(item.created_at)}</p>
      </div>

      {/* Amount */}
      <div className={`text-sm font-bold shrink-0 tabular-nums ${cfg.amountClass}`}>
        {cfg.prefix}{item.amount.toLocaleString()}
        <span className="text-[10px] font-normal ml-0.5 opacity-70">c</span>
      </div>
    </div>
  )
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const res = await fetch('/api/activity?limit=60')
      if (res.ok) setItems(await res.json())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Auto-refresh every 30s
    const id = setInterval(() => load(), 30_000)
    return () => clearInterval(id)
  }, [load])

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-sky-400" />
            <h1 className="text-xl font-bold">Activity Feed</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Live betting activity across all markets</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Feed */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Activity size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No activity yet</p>
            <p className="text-sm mt-1">Place the first bet to get things started!</p>
          </div>
        ) : (
          <div>
            {items.map(item => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground pb-4">
        Showing the last {items.length} actions · Auto-refreshes every 30s
      </p>
    </div>
  )
}
