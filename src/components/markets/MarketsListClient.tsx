'use client'

import { useState, useEffect } from 'react'
import { Market } from '@/types'
import { MarketCard } from './MarketCard'

interface Props {
  initialMarkets: (Market & { creator_name?: string })[]
  schoolFilter?: string
}

export function MarketsListClient({ initialMarkets, schoolFilter }: Props) {
  const [markets, setMarkets] = useState(initialMarkets)

  useEffect(() => {
    setMarkets(initialMarkets)
  }, [initialMarkets])

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const url = schoolFilter
          ? `/api/markets?status=open&school=${encodeURIComponent(schoolFilter)}`
          : '/api/markets?status=open'
        const res = await fetch(url)
        if (!res.ok) return
        const data: (Market & { creator_name?: string })[] = await res.json()
        const filtered = schoolFilter ? data.filter(m => m.school === schoolFilter) : data
        setMarkets(filtered)
      } catch { /* silent */ }
    }

    const interval = setInterval(fetchMarkets, 30000)
    return () => clearInterval(interval)
  }, [schoolFilter])

  if (markets.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">No open markets yet.</p>
        <p className="text-sm mt-1">Submit one and the admin will review it!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {markets.map(market => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  )
}
