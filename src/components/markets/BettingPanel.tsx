'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Market } from '@/types'
import { toast } from 'sonner'

interface BettingPanelProps {
  market: Market
  userBalance: number
}

export function BettingPanel({ market, userBalance }: BettingPanelProps) {
  const router = useRouter()
  const [side, setSide] = useState<'YES' | 'NO'>('YES')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const coins = Math.floor(Number(amount))
  const price = side === 'YES' ? (market.yes_price ?? 0.5) : (market.no_price ?? 0.5)
  const estimatedPayout = coins > 0 && price > 0 ? Math.floor(coins / price) : 0

  async function handleBet() {
    if (!coins || coins < 1) {
      toast.error('Enter a valid amount')
      return
    }
    if (coins > userBalance) {
      toast.error('Not enough coins')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/markets/${market.id}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side, amount: coins }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Bet failed')
        return
      }
      toast.success(`Bet placed! ${coins} coins on ${side}`)
      setAmount('')
      router.refresh()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (market.status !== 'open') {
    return (
      <div className="rounded-lg border bg-muted p-4 text-center text-sm text-muted-foreground">
        {market.status === 'resolved'
          ? `Market resolved: ${market.outcome}`
          : 'Betting is closed for this market'}
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h3 className="font-semibold">Place a Bet</h3>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={side === 'YES' ? 'default' : 'outline'}
          className={side === 'YES' ? 'bg-green-600 hover:bg-green-700' : ''}
          onClick={() => setSide('YES')}
        >
          YES — {Math.round((market.yes_price ?? 0.5) * 100)}¢
        </Button>
        <Button
          variant={side === 'NO' ? 'default' : 'outline'}
          className={side === 'NO' ? 'bg-red-500 hover:bg-red-600' : ''}
          onClick={() => setSide('NO')}
        >
          NO — {Math.round((market.no_price ?? 0.5) * 100)}¢
        </Button>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Amount (coins)</label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            max={userBalance}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="e.g. 100"
          />
          <Button variant="outline" size="sm" onClick={() => setAmount(String(userBalance))}>
            Max
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Balance: {userBalance.toLocaleString()} coins</p>
      </div>

      {coins > 0 && (
        <div className="rounded bg-muted px-3 py-2 text-sm">
          <p>Estimated payout: ~{estimatedPayout.toLocaleString()} coins</p>
          <p className="text-xs text-muted-foreground">(Changes as others bet)</p>
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleBet}
        disabled={loading || !coins || coins < 1 || coins > userBalance}
      >
        {loading ? 'Placing bet...' : `Bet ${coins || 0} coins on ${side}`}
      </Button>
    </div>
  )
}
