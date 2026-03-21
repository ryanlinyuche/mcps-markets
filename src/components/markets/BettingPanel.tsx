'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Market, OptionPool } from '@/types'
import { toast } from 'sonner'
import { Coins } from 'lucide-react'

interface BettingPanelProps {
  market: Market
  userBalance: number
  optionPools?: OptionPool[]
  onBetSuccess?: (newBalance: number) => void
}

const PRESETS = [25, 100, 250]

export function BettingPanel({ market, userBalance, optionPools, onBetSuccess }: BettingPanelProps) {
  const router = useRouter()
  const isScore = market.market_type === 'score' || market.market_type === 'personal_score'
  const isSports = market.market_type === 'sports'
  const isOverUnder = market.score_subtype === 'overunder'
  const isSatAct = market.market_type === 'sat_act'
  const useYesNo = !isScore || isOverUnder || isSatAct

  const yesLabel = isSports && market.team_a ? market.team_a
    : (isOverUnder || isSatAct) && market.score_threshold ? `Over ${market.score_threshold}`
    : 'YES'
  const noLabel = isSports && market.team_b ? market.team_b
    : (isOverUnder || isSatAct) && market.score_threshold ? `Under ${market.score_threshold}`
    : 'NO'

  const defaultSide = isScore && !isOverUnder && !isSatAct ? (optionPools?.[0]?.label ?? '') : 'YES'
  const [side, setSide] = useState<string>(defaultSide)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const coins = Math.floor(Number(amount))
  const price = side === 'YES' ? (market.yes_price ?? 0.5) : (market.no_price ?? 0.5)
  const priceCoins = price * 100
  const shares = coins > 0 && priceCoins > 0 ? coins / priceCoins : 0
  const yesnoReturn = Math.floor(shares * 100)
  const yesnoProfit = yesnoReturn - coins

  const selectedPool = optionPools?.find(o => o.label === side)
  const totalScorePool = optionPools?.reduce((s, o) => s + o.amount, 0) ?? 0
  const scoreReturn = coins > 0 && selectedPool
    ? Math.floor(selectedPool.amount === 0
        ? coins * (optionPools?.length ?? 5)
        : (coins / (selectedPool.amount + coins)) * (totalScorePool + coins))
    : 0
  const scoreProfit = scoreReturn - coins
  const estimatedReturn = isScore && !isOverUnder && !isSatAct ? scoreReturn : yesnoReturn
  const estimatedProfit = isScore && !isOverUnder && !isSatAct ? scoreProfit : yesnoProfit

  const isYesSide = side === 'YES' || (useYesNo && !['NO'].includes(side))
  const sideColor = isYesSide ? 'sky' : 'orange'

  async function handleBet() {
    if (!coins || coins < 1) { toast.error('Enter a valid amount'); return }
    if (coins > userBalance) { toast.error('Not enough coins'); return }
    if (!side) { toast.error('Select an option'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/markets/${market.id}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side, amount: coins }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Bet failed'); return }
      const sideLabel = side === 'YES' ? yesLabel : side === 'NO' ? noLabel : side
      toast.success(`Bet ${coins} coins on ${sideLabel}`)
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
      <div className="rounded-2xl border border-white/8 bg-card p-4 text-center text-sm text-muted-foreground">
        {market.status === 'resolved' ? `Market resolved: ${market.outcome}` : 'Betting is closed'}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Trade</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Coins size={12} />
          <span>{userBalance.toLocaleString()} coins</span>
        </div>
      </div>

      {/* Side selector */}
      {isScore && !isOverUnder && !isSatAct && optionPools ? (
        <div className="space-y-1.5">
          {optionPools.map(opt => {
            const pct = totalScorePool === 0 ? Math.round(100 / optionPools.length) : Math.round((opt.amount / totalScorePool) * 100)
            const active = side === opt.label
            return (
              <button key={opt.label} onClick={() => setSide(opt.label)}
                className={`w-full flex justify-between items-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                  active ? 'border-sky-500/50 bg-sky-500/15 text-sky-300' : 'border-white/8 hover:border-white/20 text-muted-foreground hover:text-foreground'
                }`}>
                <span>{opt.label}</span>
                <span className="text-xs">{pct}%</span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setSide('YES')}
            className={`rounded-xl border py-3 text-sm font-bold transition-all ${
              side === 'YES'
                ? 'border-sky-500 bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                : 'border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
            }`}>
            <div>{yesLabel}</div>
            <div className="text-xs font-normal opacity-75 mt-0.5">{Math.round((market.yes_price ?? 0.5) * 100)}%</div>
          </button>
          <button onClick={() => setSide('NO')}
            className={`rounded-xl border py-3 text-sm font-bold transition-all ${
              side === 'NO'
                ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : 'border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
            }`}>
            <div>{noLabel}</div>
            <div className="text-xs font-normal opacity-75 mt-0.5">{Math.round((market.no_price ?? 0.5) * 100)}%</div>
          </button>
        </div>
      )}

      {/* Amount presets */}
      <div className="space-y-2">
        <div className="flex gap-1.5">
          {PRESETS.map(p => (
            <button key={p} onClick={() => setAmount(String(Math.min(p, userBalance)))}
              className={`flex-1 text-xs py-1.5 rounded-lg border transition-all font-medium ${
                Number(amount) === p
                  ? sideColor === 'sky'
                    ? 'border-sky-500/50 bg-sky-500/15 text-sky-300'
                    : 'border-orange-500/50 bg-orange-500/15 text-orange-300'
                  : 'border-white/8 hover:border-white/20 text-muted-foreground hover:text-foreground'
              }`}>
              +{p}
            </button>
          ))}
          <button onClick={() => setAmount(String(userBalance))}
            className="flex-1 text-xs py-1.5 rounded-lg border border-white/8 hover:border-white/20 text-muted-foreground hover:text-foreground transition-all font-medium">
            Max
          </button>
        </div>
        <div className="relative">
          <input
            type="number"
            min={1}
            max={userBalance}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Enter amount..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-sky-500/50 focus:bg-sky-500/5 transition-all placeholder:text-muted-foreground"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">coins</span>
        </div>
      </div>

      {/* Payout preview */}
      {coins > 0 && (
        <div className="rounded-xl bg-white/4 border border-white/8 px-4 py-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Potential return</span>
            <span className="font-medium">{estimatedReturn.toLocaleString()} coins</span>
          </div>
          <div className="flex justify-between text-xs border-t border-white/8 pt-1.5">
            <span className="text-muted-foreground">Max profit</span>
            <span className={`font-bold ${estimatedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {estimatedProfit >= 0 ? '+' : ''}{estimatedProfit.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Trade button */}
      <button
        onClick={handleBet}
        disabled={loading || !coins || coins < 1 || coins > userBalance}
        className={`w-full rounded-xl py-3.5 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
          side === 'NO'
            ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20'
            : 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20'
        }`}>
        {loading ? 'Placing bet...' : `Buy ${side === 'YES' ? yesLabel : side === 'NO' ? noLabel : side} — ${coins || 0} coins`}
      </button>
    </div>
  )
}
