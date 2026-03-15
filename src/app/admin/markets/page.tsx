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
  const [loading, setLoading] = useState(true)

  async function fetchMarkets() {
    const [pendingRes, openRes] = await Promise.all([
      fetch('/api/admin/markets?status=pending_approval'),
      fetch('/api/admin/markets?status=open'),
    ])
    setPending(await pendingRes.json())
    setOpen(await openRes.json())
    setLoading(false)
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

  if (loading) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
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

        <TabsContent value="open" className="mt-4 space-y-3">
          {open.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6">No open markets.</p>
          ) : (
            open.map(market => (
              <div key={market.id} className="rounded-lg border p-4 flex justify-between items-center gap-4">
                <div>
                  <p className="font-semibold">{market.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pool: {(market.yes_pool + market.no_pool).toLocaleString()} coins · YES {Math.round((market.yes_price ?? 0.5) * 100)}% / NO {Math.round((market.no_price ?? 0.5) * 100)}%
                  </p>
                </div>
                <Link
                  href={`/admin/resolve/${market.id}`}
                  className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Resolve
                </Link>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
