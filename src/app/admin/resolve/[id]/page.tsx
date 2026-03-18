'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Market, OptionPool } from '@/types'
import { toast } from 'sonner'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

type MarketWithExtras = Market & {
  yes_price: number
  no_price: number
  option_pools?: OptionPool[]
  flag_count?: number
}

export default function ResolvePage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [market, setMarket] = useState<MarketWithExtras | null>(null)
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetch(`/api/markets/${id}`).then(r => r.json()).then(setMarket)
  }, [id])

  async function handleResolve(outcome: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/markets/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, resolution_notes: notes }),
      })
      if (res.ok) {
        toast.success(`Market resolved: ${outcome}`)
        router.push('/admin/markets')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to resolve')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!market) return <p className="text-muted-foreground">Loading...</p>

  const isScore = market.market_type === 'score' || market.market_type === 'personal_score'
  const total = isScore
    ? (market.option_pools?.reduce((s, o) => s + o.amount, 0) ?? 0)
    : market.yes_pool + market.no_pool

  return (
    <div className="max-w-xl space-y-6">
      <Link href="/admin/markets" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back
      </Link>

      <div>
        <h2 className="text-xl font-bold">Resolve Market</h2>
        <p className="text-muted-foreground mt-1">{market.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {isScore && (
            <p className="text-xs font-medium text-blue-600 bg-blue-50 rounded px-2 py-0.5 w-fit">
              Test Score Market
            </p>
          )}
          {(market.flag_count ?? 0) > 0 && (
            <p className="text-xs font-medium text-orange-700 bg-orange-50 rounded px-2 py-0.5 w-fit">
              &#128681; {market.flag_count} user{market.flag_count !== 1 ? 's' : ''} flagged for resolution
            </p>
          )}
        </div>
      </div>

      {/* Resolution criteria */}
      {(market.resolution_criteria || market.resolution_source) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-blue-800">Resolution Rules</p>
          {market.resolution_criteria && (
            <div>
              <p className="text-xs text-blue-700 font-medium uppercase tracking-wide">Criteria</p>
              <p className="text-sm text-blue-900">{market.resolution_criteria}</p>
            </div>
          )}
          {market.resolution_source && (
            <div>
              <p className="text-xs text-blue-700 font-medium uppercase tracking-wide">Source</p>
              <p className="text-sm text-blue-900">{market.resolution_source}</p>
            </div>
          )}
        </div>
      )}

      {isScore && market.option_pools ? (
        <div className="rounded-lg border divide-y">
          {market.option_pools.map(opt => (
            <div key={opt.label} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.amount.toLocaleString()} coins wagered</p>
              </div>
              <CoinDisplay amount={opt.amount} size="sm" />
            </div>
          ))}
          <div className="px-4 py-3 flex justify-between items-center">
            <p className="text-sm text-muted-foreground font-medium">Total wagered</p>
            <CoinDisplay amount={total} />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border p-4 grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">YES pool</p>
            <CoinDisplay amount={market.yes_pool} size="lg" />
            <p className="text-sm text-green-600 font-medium mt-1">{Math.round((market.yes_price ?? 0.5) * 100)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">NO pool</p>
            <CoinDisplay amount={market.no_pool} size="lg" />
            <p className="text-sm text-red-500 font-medium mt-1">{Math.round((market.no_price ?? 0.5) * 100)}%</p>
          </div>
          <div className="col-span-2 border-t pt-3">
            <p className="text-sm text-muted-foreground">Total wagered</p>
            <CoinDisplay amount={total} />
          </div>
        </div>
      )}

      {/* Resolution notes */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Resolution Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Class average was 78.4, confirmed via Canvas gradebook on 3/15"
          className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">Explain your resolution decision. This will be visible to all users.</p>
      </div>

      <p className="text-sm text-muted-foreground">
        Winners will receive a proportional payout from the total pool. This action cannot be undone.
      </p>

      {isScore && market.option_pools ? (
        <div className="grid grid-cols-1 gap-3">
          {market.option_pools.map(opt => (
            <Button
              key={opt.label}
              variant="outline"
              className="h-12 text-base justify-start px-4"
              onClick={() => handleResolve(opt.label)}
              disabled={loading}
            >
              Resolve: {opt.label}
            </Button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Button
            className="bg-green-600 hover:bg-green-700 h-16 text-lg"
            onClick={() => handleResolve('YES')}
            disabled={loading}
          >
            Resolve YES
          </Button>
          <Button
            className="bg-red-500 hover:bg-red-600 h-16 text-lg"
            onClick={() => handleResolve('NO')}
            disabled={loading}
          >
            Resolve NO
          </Button>
        </div>
      )}

      {/* N/A Cancel */}
      <div className="border-t pt-4">
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <AlertTriangle size={12} />
          If the event was cancelled or the outcome can&apos;t be determined:
        </p>
        <Button
          variant="outline"
          className="w-full border-red-200 text-red-600 hover:bg-red-50"
          onClick={() => handleResolve('N/A')}
          disabled={loading}
        >
          Resolve N/A &mdash; Refund All Bets
        </Button>
      </div>
    </div>
  )
}
