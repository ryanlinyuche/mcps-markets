'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Market, OptionPool } from '@/types'
import { toast } from 'sonner'

interface BettingPanelProps {
  market: Market
  userBalance: number
  optionPools?: OptionPool[]
  onBetSuccess?: (newBalance: number) => void
}

export function BettingPanel({ market, userBalance, optionPools, onBetSuccess }: BettingPanelProps) {
  const router = useRouter()
  const isScore = market.market_type === 'score' || market.market_type === 'personal_score'
  const isSports = market.market_type === 'sports'
  const yesLabel = isSports && market.team_a ? market.team_a : 'YES'
  const noLabel = isSports && market.team_b ? market.team_b : 'NO'

  const defaultSide = isScore
    ? (optionPools?.[0]?.label ?? '')
    : 'YES'

  const [side, setSide] = useState<string>(defaultSide)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const coins = Math.floor(Number(amount))

  // --- Yes/No share math ---
  // price is per-share cost in coins (e.g. 60 coins buys 1 share at 60% odds)
  const price = side === 'YES' ? (market.yes_price ?? 0.5) : (market.no_price ?? 0.5)
  const priceCoins = price * 100  // e.g. 60 coins = 60c per share
  const shares = coins > 0 && priceCoins > 0 ? coins / priceCoins : 0
  // Each share pays 100 coins if you win
  const yesnoReturn = Math.floor(shares * 100)
  const yesnoProfit = yesnoReturn - coins

  // --- Score market payout ---
  const selectedPool = optionPools?.find(o => o.label === side)
  const totalScorePool = optionPools?.reduce((s, o) => s + o.amount, 0) ?? 0
  const scoreReturn = coins > 0 && selectedPool
    ? Math.floor(
        selectedPool.amount === 0
          ? coins * (optionPools?.length ?? 5)
          : (coins / (selectedPool.amount + coins)) * (totalScorePool + coins)
      )
    : 0
  const scoreProfit = scoreReturn - coins

  const estimatedReturn = isScore ? scoreReturn : yesnoReturn
  const estimatedProfit = isScore ? scoreProfit : yesnoProfit

  async function handleBet() {
    if (!coins || coins < 1) {
      toast.error('Enter a valid amount')
      return
    }
    if (coins > userBalance) {
      toast.error('Not enough coins')
      return
    }
    if (!side) {
      toast.error('Select an option')
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
      const sideLabel = side === 'YES' ? yesLabel : side === 'NO' ? noLabel : side
      toast.success(`Bought ${isScore ? sideLabel : `${shares.toFixed(2)} ${sideLabel} shares`} for ${coins} coins`)
      setAmount('')
      onBetSuccess?.(data.newBalance)
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

      {isScore && optionPools ? (
        <div className="grid grid-cols-1 gap-2">
          {optionPools.map(opt => {
            const total = totalScorePool
            const pct = total === 0 ? Math.round(100 / optionPools.length) : Math.round((opt.amount / total) * 100)
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => setSide(opt.label)}
                className={`flex justify-between items-center rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                  side === opt.label
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                }`}
              >
                <span>{opt.label}</span>
                <span className="text-xs text-muted-foreground">{pct}%</span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide('YES')}
            className={`rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors ${
              side === 'YES'
                ? 'border-green-600 bg-green-600 text-white'
                : 'border-green-200 text-green-700 hover:bg-green-50'
            }`}
          >
            <div>Buy {yesLabel}</div>
            <div className="text-xs font-normal opacity-80">{Math.round((market.yes_price ?? 0.5) * 100)}% chance</div>
          </button>
          <button
            type="button"
            onClick={() => setSide('NO')}
            className={`rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors ${
              side === 'NO'
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-red-200 text-red-600 hover:bg-red-50'
            }`}
          >
            <div>Buy {noLabel}</div>
            <div className="text-xs font-normal opacity-80">{Math.round((market.no_price ?? 0.5) * 100)}% chance</div>
          </button>
        </div>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Amount</label>
          <span className="text-xs text-muted-foreground">Min bet: 1 coin</span>
        </div>
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
        <div className="rounded-md bg-muted px-3 py-2.5 text-sm space-y-1">
          {!isScore && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shares</span>
              <span className="font-medium">{shares.toFixed(2)}</span>
            </div>
          )}
          {!isScore && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg price</span>
              <span className="font-medium">{Math.round(priceCoins)}% avg odds</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Potential return</span>
            <span className="font-medium">{estimatedReturn.toLocaleString()} coins</span>
          </div>
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="text-muted-foreground">Max profit</span>
            <span className={`font-semibold ${estimatedProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {estimatedProfit >= 0 ? '+' : ''}{estimatedProfit.toLocaleString()} coins
            </span>
          </div>
          <p className="text-xs text-muted-foreground">(Changes as others bet)</p>
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleBet}
        disabled={loading || !coins || coins < 1 || coins > userBalance}
      >
        {loading
          ? 'Placing bet...'
          : isScore
            ? `Buy ${side} for ${coins || 0} coins`
            : `Buy ${shares > 0 ? shares.toFixed(2) : '0'} ${side === 'YES' ? yesLabel : noLabel} shares for ${coins || 0} coins`
        }
      </Button>
    </div>
  )
}
