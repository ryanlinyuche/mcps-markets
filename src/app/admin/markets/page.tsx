'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Market } from '@/types'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AdminMarketsPage() {
  const router = useRouter()
  const [pending, setPending] = useState<(Market & { creator_name: string })[]>([])
  const [open, setOpen] = useState<(Market & { creator_name: string })[]>([])
  const [pendingResolution, setPendingResolution] = useState<(Market & { creator_name: string })[]>([])
  const [featured, setFeatured] = useState<(Market & { creator_name: string })[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchMarkets() {
    try {
      const [pendingRes, openRes, pendingResolutionRes, featuredRes] = await Promise.all([
        fetch('/api/admin/markets?status=pending_approval'),
        fetch('/api/admin/markets?status=open'),
        fetch('/api/admin/markets?status=pending_resolution'),
        fetch('/api/markets/featured'),
      ])
      const pendingData = await pendingRes.json()
      const openData = await openRes.json()
      const pendingResolutionData = await pendingResolutionRes.json()
      const featuredData = await featuredRes.json()
      setPending(Array.isArray(pendingData) ? pendingData : [])
      setOpen(Array.isArray(openData) ? openData : [])
      setPendingResolution(Array.isArray(pendingResolutionData) ? pendingResolutionData : [])
      setFeatured(Array.isArray(featuredData) ? featuredData : [])
    } catch (e) {
      console.error('Failed to fetch markets:', e)
      toast.error('Failed to load markets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMarkets() }, [])

  async function handleAction(marketId: number, action: 'approve' | 'reject') {
    const res = await fetch('/api/admin/markets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketId, action }),
    })
    if (res.ok) {
      toast.success(`Market ${action === 'approve' ? 'approved' : 'rejected'}`)
      fetchMarkets()
    } else {
      toast.error('Action failed')
    }
  }

  async function handleFeature(marketId: number) {
    const res = await fetch(`/api/admin/markets/${marketId}/feature`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      toast.success('Market featured')
      fetchMarkets()
    } else {
      toast.error(data.error || 'Failed to feature market')
    }
  }

  async function handleUnfeature(marketId: number) {
    const res = await fetch(`/api/admin/markets/${marketId}/feature`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Market removed from featured')
      fetchMarkets()
    } else {
      toast.error('Failed to unfeature market')
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>

  const featuredIds = new Set(featured.map(f => f.id))

  return (
    <div className="space-y-6">
      <Tabs defaultValue={pendingResolution.length > 0 ? 'resolution' : 'pending'}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="resolution">
            Resolution Requests
            {pendingResolution.length > 0 && (
              <span className="ml-1.5 bg-yellow-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
                {pendingResolution.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
          <TabsTrigger value="featured">⭐ Featured ({featured.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6">No pending markets.</p>
          ) : (
            pending.map(market => (
              <div key={market.id} className="rounded-lg border p-4 space-y-3">
                <div>
                  <p className="font-semibold">{market.title}</p>
                  {market.description && <p className="text-sm text-muted-foreground mt-1">{market.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">By {market.creator_name} · {new Date(market.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(market.id, 'approve')}>
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleAction(market.id, 'reject')}>
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="resolution" className="mt-4 space-y-3">
          {pendingResolution.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6">No pending resolution requests.</p>
          ) : (
            pendingResolution.map(market => (
              <div key={market.id} className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 flex justify-between items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{market.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    By {market.creator_name} · Proposed: <span className="font-medium text-yellow-800">{market.pending_outcome}</span>
                  </p>
                </div>
                <Link
                  href={`/admin/resolve/${market.id}`}
                  className="inline-flex items-center justify-center rounded-md border border-yellow-400 bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800 hover:bg-yellow-200 transition-colors shrink-0"
                >
                  Review
                </Link>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="open" className="mt-4 space-y-3">
          {open.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6">No open markets.</p>
          ) : (
            open.map(market => (
              <div key={market.id} className="rounded-lg border p-4 flex justify-between items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{market.title}</p>
                    {(market.flag_count ?? 0) > 0 && (
                      <span className="text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5 shrink-0">
                        🚩 {market.flag_count}
                      </span>
                    )}
                    {featuredIds.has(market.id) && (
                      <span className="text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-full px-2 py-0.5 shrink-0">
                        ⭐ Featured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pool: {(market.yes_pool + market.no_pool).toLocaleString()} coins · YES {Math.round((market.yes_price ?? 0.5) * 100)}% / NO {Math.round((market.no_price ?? 0.5) * 100)}%
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {featuredIds.has(market.id) ? (
                    <button
                      onClick={() => handleUnfeature(market.id)}
                      className="inline-flex items-center justify-center rounded-md border border-yellow-300 bg-yellow-50 px-3 py-1 text-sm font-medium text-yellow-700 hover:bg-yellow-100 transition-colors"
                    >
                      ★ Unfeature
                    </button>
                  ) : (
                    <button
                      onClick={() => handleFeature(market.id)}
                      className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1 text-sm font-medium hover:bg-muted transition-colors"
                    >
                      ☆ Feature
                    </button>
                  )}
                  <Link
                    href={`/admin/resolve/${market.id}`}
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Resolve
                  </Link>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="featured" className="mt-4 space-y-3">
          {featured.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6">No featured markets. Go to the Open tab to feature markets.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Featured markets appear in the carousel on the markets page. Max 5.</p>
              {featured.map(market => (
                <div key={market.id} className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-500/10 dark:border-yellow-500/30 p-4 flex justify-between items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{market.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      By {market.creator_name} · Pool: {(market.yes_pool + market.no_pool).toLocaleString()} coins
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/markets/${market.id}`}
                      className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1 text-sm font-medium hover:bg-muted transition-colors"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleUnfeature(market.id)}
                      className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
