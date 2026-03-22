'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { MarketCard } from '@/components/markets/MarketCard'
import { FeaturedCarousel } from '@/components/markets/FeaturedCarousel'
import { Market } from '@/types'
import { Loader2, PlusCircle } from 'lucide-react'
import Link from 'next/link'

interface FilterDef {
  id: string
  label: string
  tab: string
  type?: string
  filter?: string
}

const FILTERS: FilterDef[] = [
  { id: 'ongoing',      label: 'All',           tab: 'ongoing' },
  { id: 'ending_soon',  label: '🔥 Ending Soon', tab: 'ongoing', filter: 'ending_soon' },
  { id: 'sports',       label: 'Sports',         tab: 'ongoing', type: 'sports' },
  { id: 'score',        label: 'Score',          tab: 'ongoing', type: 'score' },
  { id: 'sat_act',      label: 'SAT / ACT',      tab: 'ongoing', type: 'sat_act' },
  { id: 'closed',       label: 'Closed',         tab: 'closed' },
  { id: 'resolved',     label: 'Resolved',       tab: 'resolved' },
  { id: 'yours',        label: 'Your Markets',   tab: 'yours' },
]

export default function AllMarketsPage() {
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type')
  const filterParam = searchParams.get('filter')

  const initialFilter: string = (() => {
    if (filterParam === 'ending_soon') return 'ending_soon'
    if (typeParam) {
      const found = FILTERS.find(f => f.type === typeParam)
      if (found) return found.id
    }
    return 'ongoing'
  })()

  const [activeFilter, setActiveFilter] = useState<string>(initialFilter)
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)

  const loadMarkets = useCallback(async (filterId: string) => {
    setLoading(true)
    const filter = FILTERS.find(f => f.id === filterId)!
    const url = `/api/markets?tab=${filter.tab}`
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      let data: Market[] = await res.json()

      // Client-side type filter for score/sports/sat_act
      if (filter.type) {
        const t = filter.type
        if (t === 'score') {
          data = data.filter(m => m.market_type === 'score' || m.market_type === 'personal_score')
        } else {
          data = data.filter(m => m.market_type === t)
        }
      }

      // Client-side filter for ending_soon
      if (filter.filter === 'ending_soon') {
        const now = new Date()
        const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        data = data.filter(m =>
          m.closes_at !== null &&
          new Date(m.closes_at) > now &&
          new Date(m.closes_at) <= threeDaysFromNow
        )
        data.sort((a, b) => new Date(a.closes_at!).getTime() - new Date(b.closes_at!).getTime())
      }

      setMarkets(data)
    } catch {
      setMarkets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMarkets(activeFilter) }, [activeFilter, loadMarkets])

  const emptyMessages: Record<string, string> = {
    'ongoing':      'No open markets right now — submit one!',
    'ending_soon':  'No markets closing in the next 3 days.',
    'sports':       'No sports markets open right now.',
    'score':        'No score markets open right now.',
    'sat_act':      'No SAT/ACT markets open right now.',
    'closed':       'No markets awaiting resolution.',
    'resolved':     'No resolved markets yet.',
    'yours':        "You haven't created any markets yet.",
  }

  return (
    <div className="space-y-5">
      <FeaturedCarousel />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">All markets</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {markets.length} market{markets.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Link
          href="/markets/submit"
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0 mt-1"
        >
          <PlusCircle size={15} />
          Submit
        </Link>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
              activeFilter === f.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium">{emptyMessages[activeFilter] ?? 'No markets found.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {markets.map(m => <MarketCard key={m.id} market={m} />)}
        </div>
      )}
    </div>
  )
}
