'use client'

import { useState, useEffect, useCallback } from 'react'
import { Market } from '@/types'
import { MarketCard } from './MarketCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'

interface Props {
  userId: number | null
  isLoggedIn: boolean
}

function MarketGrid({ markets, emptyMessage }: { markets: Market[]; emptyMessage: string }) {
  if (markets.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">{emptyMessage}</p>
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

function useTabMarkets(tab: string, userId: number | null, betOnly?: boolean) {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      let url = `/api/markets?tab=${tab}`
      if (userId) url += `&userId=${userId}`
      if (betOnly) url += `&betOnly=true`
      const res = await fetch(url)
      if (res.ok) setMarkets(await res.json())
    } catch { /* silent */ }
    setLoading(false)
  }, [tab, userId, betOnly])

  useEffect(() => { fetch_() }, [fetch_])

  return { markets, loading, refetch: fetch_ }
}

export function MarketsPageClient({ userId, isLoggedIn }: Props) {
  const [activeTab, setActiveTab] = useState(isLoggedIn ? 'yours' : 'ongoing')
  const [betOnly, setBetOnly] = useState(false)

  const yours = useTabMarkets('yours', userId)
  const ongoing = useTabMarkets('ongoing', null)
  const closed = useTabMarkets('closed', null)
  const resolved = useTabMarkets('resolved', userId, betOnly)

  // Refetch resolved when betOnly toggle changes
  useEffect(() => { if (activeTab === 'resolved') resolved.refetch() }, [betOnly]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Markets</h1>
        <Link
          href="/markets/submit"
          className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <PlusCircle size={16} />
          Submit Market
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {isLoggedIn && <TabsTrigger value="yours">Your Markets</TabsTrigger>}
          <TabsTrigger value="ongoing">
            Ongoing
            {ongoing.markets.length > 0 && (
              <span className="ml-1.5 text-xs font-semibold opacity-70">({ongoing.markets.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        {isLoggedIn && (
          <TabsContent value="yours" className="mt-6">
            {yours.loading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Markets you&apos;ve created. Click a market to request resolution with proof.
                </p>
                <MarketGrid
                  markets={yours.markets}
                  emptyMessage="You haven't created any markets yet."
                />
              </>
            )}
          </TabsContent>
        )}

        <TabsContent value="ongoing" className="mt-6">
          {ongoing.loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : (
            <MarketGrid
              markets={ongoing.markets}
              emptyMessage="No ongoing markets right now."
            />
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-6">
          {closed.loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Betting has closed on these markets — awaiting resolution.
              </p>
              <MarketGrid
                markets={closed.markets}
                emptyMessage="No closed markets awaiting resolution."
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-6 space-y-4">
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
          {resolved.loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : (
            <MarketGrid
              markets={resolved.markets}
              emptyMessage={betOnly ? "You haven't bet on any resolved markets." : "No resolved markets yet."}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
