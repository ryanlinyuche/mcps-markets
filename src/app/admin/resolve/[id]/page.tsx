'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Market } from '@/types'
import { toast } from 'sonner'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ResolvePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [market, setMarket] = useState<Market & { yes_price: number; no_price: number } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/markets/${id}`).then(r => r.json()).then(setMarket)
  }, [id])

  async function handleResolve(outcome: 'YES' | 'NO') {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/markets/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
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

  const total = market.yes_pool + market.no_pool

  return (
    <div className="max-w-xl space-y-6">
      <Link href="/admin/markets" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back
      </Link>

      <div>
        <h2 className="text-xl font-bold">Resolve Market</h2>
        <p className="text-muted-foreground mt-1">{market.title}</p>
      </div>

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

      <p className="text-sm text-muted-foreground">
        Winners will receive a proportional payout from the total pool. This action cannot be undone.
      </p>

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
    </div>
  )
}
