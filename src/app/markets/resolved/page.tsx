'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Market } from '@/types'
import { MarketCard } from '@/components/markets/MarketCard'

export default function ResolvedMarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [betOnly, setBetOnly] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data?.id) { setUserId(data.id); setIsLoggedIn(true) }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    let url = '/api/markets?tab=resolved'
    if (betOnly && userId) url += `&betOnly=true&userId=${userId}`
    fetch(url).then(r => r.json()).then(data => {
      setMarkets(Array.isArray(data) ? data : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [betOnly, userId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Resolved Markets</h1>
          <p className="text-sm text-muted-foreground">{markets.length} resolved market{markets.length !== 1 ? 's' : ''}</p>
        </div>
        {isLoggedIn && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBetOnly(false)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!betOnly ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}
            >
              All Markets
            </button>
            <button
              onClick={() => setBetOnly(true)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${betOnly ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}
            >
              My Bets Only
            </button>
          </div>
        )}
      </div>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : markets.length === 0 ? (
        <p className="text-center py-16 text-muted-foreground">
          {betOnly ? "You haven't bet on any resolved markets." : 'No resolved markets yet.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {markets.map(m => <MarketCard key={m.id} market={m} />)}
        </div>
      )}
    </div>
  )
}
