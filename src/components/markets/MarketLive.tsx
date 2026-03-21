'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Market, OptionPool } from '@/types'
import { BettingPanel } from './BettingPanel'
import { OddsDisplay } from './OddsDisplay'
import { Info, ImagePlus, Clock, Send, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

const PALETTE = ['#38bdf8', '#f97316', '#34d399', '#a78bfa', '#fbbf24']

function computeScoreOdds(options: OptionPool[]) {
  const total = options.reduce((s, o) => s + o.amount, 0)
  return options.map(o => ({ ...o, price: total === 0 ? 1 / options.length : o.amount / total }))
}

interface HistoryPoint { yes_pool: number; no_pool: number; recorded_at: string }
interface ScoreHistoryPoint { snapshot: string; recorded_at: string }

interface Props {
  initialMarket: Market
  userBalance: number
  initialOptionPools?: OptionPool[]
  initialHistory?: HistoryPoint[]
  isLoggedIn: boolean
  isCreator?: boolean
  isAdmin?: boolean
}

function OddsChart({ history }: { history: HistoryPoint[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; pct: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const W = 500, H = 120, PAD_LEFT = 36, PAD_RIGHT = 8, PAD_TOP = 8, PAD_BOTTOM = 20
  const isPlaceholder = history.length < 2
  const points = isPlaceholder ? [50, 50] : history.map(h => {
    const total = h.yes_pool + h.no_pool
    return total === 0 ? 50 : (h.yes_pool / total) * 100
  })
  const last = points[points.length - 1]
  const first = points[0]
  const minV = Math.max(0, Math.min(...points) - 8)
  const maxV = Math.min(100, Math.max(...points) + 8)
  const range = Math.max(maxV - minV, 10)
  const toX = (i: number) => PAD_LEFT + (i / Math.max(points.length - 1, 1)) * (W - PAD_LEFT - PAD_RIGHT)
  const toY = (v: number) => PAD_TOP + ((maxV - v) / range) * (H - PAD_TOP - PAD_BOTTOM)
  const linePath = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${toX(points.length - 1).toFixed(1)} ${H - PAD_BOTTOM} L ${toX(0).toFixed(1)} ${H - PAD_BOTTOM} Z`
  const color = last >= 60 ? '#16a34a' : last <= 40 ? '#ef4444' : '#6366f1'
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (isPlaceholder || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const relX = Math.max(0, Math.min(1, (svgX - PAD_LEFT) / (W - PAD_LEFT - PAD_RIGHT)))
    const idx = Math.round(relX * (points.length - 1))
    setTooltip({ x: toX(idx), y: toY(points[idx]), pct: points[idx] })
  }
  return (
    <div className="rounded-2xl border border-white/8 bg-card p-4 space-y-2">
      <div className="flex justify-between items-center">
        <p className="text-xs font-medium text-muted-foreground">YES probability over time</p>
        <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ color, background: color + '18' }}>
          {Math.round(last)}%
        </span>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none"
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
        {[0, 50, 100].map(v => {
          if (v < minV - 5 || v > maxV + 5) return null
          const y = toY(v)
          return (
            <g key={v}>
              <line x1={PAD_LEFT - 4} y1={y} x2={W - PAD_RIGHT} y2={y} stroke="#1e2a3a" strokeWidth="1" strokeDasharray={v === 50 ? '4,4' : '2,2'} />
              <text x={PAD_LEFT - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill="#4a6080">{v}%</text>
            </g>
          )
        })}
        {!isPlaceholder && <path d={areaPath} fill={color} fillOpacity="0.12" />}
        <path d={linePath} fill="none" stroke={isPlaceholder ? '#e5e7eb' : color} strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" strokeDasharray={isPlaceholder ? '6,4' : undefined} />
        {!isPlaceholder && <circle cx={toX(points.length - 1)} cy={toY(last)} r="3.5" fill={color} />}
        {tooltip && (
          <g>
            <line x1={tooltip.x} y1={PAD_TOP} x2={tooltip.x} y2={H - PAD_BOTTOM} stroke="#6b7280" strokeWidth="1" strokeDasharray="3,2" />
            <circle cx={tooltip.x} cy={tooltip.y} r="4" fill={color} />
            <rect x={Math.min(tooltip.x + 6, W - 70)} y={tooltip.y - 16} width={62} height={18} rx="4" fill="#0d1526" fillOpacity="0.85" />
            <text x={Math.min(tooltip.x + 9, W - 67)} y={tooltip.y - 3} fontSize="10" fill="white">{Math.round(tooltip.pct)}% YES</text>
          </g>
        )}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        {isPlaceholder
          ? <span className="italic">Chart will appear after the first bet</span>
          : <><span>Started at {Math.round(first)}%</span><span>{history.length} bets</span></>}
      </div>
    </div>
  )
}

function ScoreChart({ history, options }: { history: ScoreHistoryPoint[]; options: string[] }) {
  const W = 500, H = 110, PAD_LEFT = 36, PAD_RIGHT = 8, PAD_TOP = 8, PAD_BOTTOM = 20
  if (history.length < 2) {
    return (
      <div className="rounded-2xl border border-white/8 bg-card p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Option percentages over time</p>
        <div className="h-20 flex items-center justify-center">
          <p className="text-xs text-muted-foreground italic">Chart will appear after the first bet</p>
        </div>
      </div>
    )
  }
  const parsed = history.map(h => { try { return JSON.parse(h.snapshot) as Record<string, number> } catch { return {} as Record<string, number> } })
  const allPoints = options.map(opt => parsed.map(p => {
    const total = Object.values(p).reduce((s, v) => s + v, 0)
    return total === 0 ? 100 / options.length : ((p[opt] ?? 0) / total) * 100
  }))
  const toX = (i: number) => PAD_LEFT + (i / Math.max(history.length - 1, 1)) * (W - PAD_LEFT - PAD_RIGHT)
  const toY = (v: number) => PAD_TOP + ((100 - v) / 100) * (H - PAD_TOP - PAD_BOTTOM)
  return (
    <div className="rounded-2xl border border-white/8 bg-card p-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Option percentages over time</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
        {[0, 50, 100].map(v => (
          <g key={v}>
            <line x1={PAD_LEFT} y1={toY(v)} x2={W - PAD_RIGHT} y2={toY(v)} stroke="#1e2a3a" strokeWidth="1" strokeDasharray={v === 50 ? '4,4' : '2,2'} />
            <text x={PAD_LEFT - 6} y={toY(v) + 3.5} textAnchor="end" fontSize="9" fill="#4a6080">{v}%</text>
          </g>
        ))}
        {allPoints.map((pts, i) => {
          const color = PALETTE[i % PALETTE.length]
          const d = pts.map((v, j) => `${j === 0 ? 'M' : 'L'} ${toX(j).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ')
          return <path key={options[i]} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        })}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {options.map((opt, i) => (
          <div key={opt} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-1.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            {opt}
          </div>
        ))}
      </div>
    </div>
  )
}

function ResolutionInfo({
  market,
}: {
  market: Market
}) {
  const hasInfo = !!(market.resolution_criteria || market.resolution_source)
  const isResolved = market.status === 'resolved'
  const isPending = market.status === 'pending_resolution'

  if (!hasInfo && !isResolved && !isPending) return null

  return (
    <div className="rounded-2xl border border-white/8 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Info size={15} className="text-muted-foreground shrink-0" />
        <h3 className="text-sm font-semibold">Resolution Info</h3>
      </div>

      {market.resolution_criteria && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Criteria</p>
          <p className="text-sm">{market.resolution_criteria}</p>
        </div>
      )}
      {market.resolution_source && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Source</p>
          <p className="text-sm">{market.resolution_source}</p>
        </div>
      )}

      {isResolved && (
        <div className={`${hasInfo ? 'pt-1 border-t' : ''} space-y-2`}>
          {market.resolution_notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Admin Notes</p>
              <p className="text-sm">{market.resolution_notes}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Resolved{market.resolved_by_name ? ` by ${market.resolved_by_name}` : ''}
            {market.resolved_at ? ` on ${new Date(market.resolved_at).toLocaleDateString('en-US')}` : ''}
          </p>
          {market.resolution_proof && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Proof</p>
              <a href={market.resolution_proof} target="_blank" rel="noopener noreferrer">
                <img src={market.resolution_proof} alt="Resolution proof"
                  className="rounded-md border max-h-64 w-full object-contain bg-muted hover:opacity-90 transition-opacity cursor-pointer" />
              </a>
              <p className="text-xs text-muted-foreground">Click to open full size</p>
            </div>
          )}
        </div>
      )}

      {isPending && market.resolution_proof && (
        <div className={`${hasInfo ? 'pt-1 border-t' : ''} space-y-1`}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Submitted Proof</p>
          <a href={market.resolution_proof} target="_blank" rel="noopener noreferrer">
            <img src={market.resolution_proof} alt="Resolution proof"
              className="rounded-md border max-h-48 w-full object-contain bg-muted hover:opacity-90 transition-opacity cursor-pointer" />
          </a>
        </div>
      )}
    </div>
  )
}

function RequestResolutionPanel({
  market, optionPools, isCreator, onResolutionRequested,
}: {
  market: Market
  optionPools?: OptionPool[]
  isCreator: boolean
  onResolutionRequested: () => void
}) {
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const proofInputRef = useRef<HTMLInputElement>(null)

  const isScore = market.market_type === 'score' || market.market_type === 'personal_score'
  const isSports = market.market_type === 'sports'
  const outcomeOptions = isScore
    ? (optionPools?.map(o => o.label) ?? [])
    : isSports && market.team_a && market.team_b
      ? [market.team_a, market.team_b, 'Draw']
      : ['YES', 'NO']

  async function handleSubmit() {
    if (!selectedOutcome || !proofFile) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('outcome', selectedOutcome)
      fd.append('file', proofFile)
      const res = await fetch(`/api/markets/${market.id}/request-resolution`, { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        toast.success('Resolution request submitted — awaiting admin approval')
        onResolutionRequested()
      } else {
        toast.error(data.error || 'Failed to submit')
      }
    } catch {
      toast.error('Something went wrong')
    }
    setSubmitting(false)
  }

  if (market.status === 'pending_resolution') {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-amber-400 shrink-0" />
          <p className="text-sm font-semibold text-amber-300">Resolution Pending Admin Approval</p>
        </div>
        <p className="text-sm text-amber-400/80">
          Proposed outcome: <span className="font-bold">{market.pending_outcome}</span>. An admin will review the proof and finalize the resolution.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-sky-400 shrink-0" />
        <p className="text-sm font-semibold">Request Resolution</p>
        <span className="text-xs text-muted-foreground">
          {isCreator ? '(you created this market)' : 'Know the outcome? Upload proof for admin review.'}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">1. Select the outcome</p>
        <div className="flex flex-wrap gap-2">
          {outcomeOptions.map(opt => (
            <button key={opt} onClick={() => setSelectedOutcome(opt === selectedOutcome ? null : opt)}
              className={`px-4 py-2 rounded-md border font-medium text-sm transition-colors ${
                selectedOutcome === opt
                  ? opt === 'YES' || opt === market.team_a ? 'bg-green-600 text-white border-green-600'
                  : opt === 'NO' || opt === market.team_b ? 'bg-red-500 text-white border-red-500'
                  : 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
              }`}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {selectedOutcome && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">2. Upload proof (screenshot from your computer)</p>
          <input ref={proofInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
          <button onClick={() => proofInputRef.current?.click()}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm transition-colors ${
              proofFile
                ? 'border-green-500 text-green-700 bg-green-50 hover:bg-green-100'
                : 'border-dashed border-border hover:bg-muted text-muted-foreground'
            }`}>
            <ImagePlus size={15} />
            {proofFile ? proofFile.name : 'Choose image file'}
          </button>

          {proofFile && (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50">
              <Send size={15} />
              {submitting ? 'Submitting...' : 'Submit for Admin Review'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function MarketLive({ initialMarket, userBalance, initialOptionPools, initialHistory = [], isLoggedIn, isCreator = false, isAdmin = false }: Props) {
  const router = useRouter()
  const [market, setMarket] = useState(initialMarket)
  const [optionPools, setOptionPools] = useState(initialOptionPools)
  const [history, setHistory] = useState<HistoryPoint[]>(initialHistory)
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryPoint[]>([])
  const [balance, setBalance] = useState(userBalance)
  const isScore = market.market_type === 'score' || market.market_type === 'personal_score'

  useEffect(() => { setMarket(initialMarket) }, [initialMarket])
  useEffect(() => { if (initialOptionPools) setOptionPools(initialOptionPools) }, [initialOptionPools])
  useEffect(() => { if (initialHistory.length) setHistory(initialHistory) }, [initialHistory])
  useEffect(() => { setBalance(userBalance) }, [userBalance])

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/markets/${initialMarket.id}?_=${Date.now()}`)
      if (!res.ok) return
      const data = await res.json()
      setMarket(data)
      if (data.option_pools) setOptionPools(data.option_pools)
      const hRes = await fetch(`/api/markets/${initialMarket.id}/history?_=${Date.now()}`)
      if (hRes.ok) {
        const hData = await hRes.json()
        if (isScore) setScoreHistory(hData)
        else setHistory(hData)
      }
    } catch { /* silent */ }
  }, [initialMarket.id, isScore])

  useEffect(() => {
    if (isScore) {
      fetch(`/api/markets/${initialMarket.id}/history`)
        .then(r => r.json()).then(setScoreHistory).catch(() => {})
    }
  }, [initialMarket.id, isScore])

  useEffect(() => {
    const interval = setInterval(refetch, 15000)
    return () => clearInterval(interval)
  }, [refetch])

  function handleBetSuccess(newBalance: number) {
    setBalance(newBalance)
    refetch()
    router.refresh()
  }

  const yesPrice = market.yes_price ?? (market.yes_pool / (market.yes_pool + market.no_pool) || 0.5)
  const noPrice = market.no_price ?? (market.no_pool / (market.yes_pool + market.no_pool) || 0.5)
  const displayedOptionPools = isScore && optionPools
    ? computeScoreOdds(optionPools).map(o => ({ ...o, market_id: initialMarket.id }))
    : optionPools
  const bettingClosed = market.status === 'open' && !!market.closes_at && new Date(market.closes_at) < new Date()
  const optionLabels = optionPools?.map(o => o.label) ?? []
  const showResolutionPanel = isLoggedIn && (
    market.status === 'open' || (isCreator && market.status === 'pending_resolution')
  )

  return (
    <>
      {market.market_type === 'personal_score' && market.subject_name && (
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 flex items-center gap-2">
          <span className="text-sm">&#x1F4CA;</span>
          <p className="text-sm font-medium text-purple-300">
            This market predicts <span className="font-bold">{market.subject_name}</span>&apos;s personal score
          </p>
        </div>
      )}

      {isScore && displayedOptionPools ? (
        <div className="rounded-2xl border border-white/8 divide-y divide-white/5">
          {displayedOptionPools.map(opt => (
            <div key={opt.label} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex-1">
                <p className="text-sm font-medium">{opt.label}</p>
                <div className="mt-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full rounded-full bg-sky-500 transition-all duration-500"
                    style={{ width: `${Math.round((opt.price ?? 0) * 100)}%` }} />
                </div>
              </div>
              <span className="text-sm font-semibold w-10 text-right">{Math.round((opt.price ?? 0) * 100)}%</span>
              <span className="text-xs text-muted-foreground w-16 text-right">{opt.amount.toLocaleString()} coins</span>
            </div>
          ))}
        </div>
      ) : (
        <OddsDisplay yesPrice={yesPrice} noPrice={noPrice} yesPool={market.yes_pool} noPool={market.no_pool} />
      )}

      {isScore
        ? <ScoreChart history={scoreHistory} options={optionLabels} />
        : <OddsChart history={history} />
      }

      {market.status === 'resolved' && market.outcome && (
        <div className={`rounded-2xl p-4 text-center font-semibold text-lg ${market.outcome === 'N/A' ? 'bg-white/5 border border-white/10 text-muted-foreground' : 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'}`}>
          Resolved: {market.outcome}
          {market.outcome === 'N/A' && (
            <span className="block text-sm font-normal text-muted-foreground mt-1">All bets have been refunded</span>
          )}
        </div>
      )}

      <ResolutionInfo market={market} />

      {showResolutionPanel && (
        <RequestResolutionPanel
          market={market}
          optionPools={optionPools}
          isCreator={isCreator}
          onResolutionRequested={refetch}
        />
      )}

      {market.status === 'pending_resolution' ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-2 text-sm text-amber-400">
          <Clock size={15} className="shrink-0" />
          Betting closed &mdash; resolution pending admin approval
        </div>
      ) : bettingClosed ? (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-center gap-2 text-sm text-yellow-400">
          <Clock size={15} className="shrink-0" />
          Betting closed &mdash; awaiting resolution
        </div>
      ) : isLoggedIn && (
        <BettingPanel
          market={{ ...market, yes_price: yesPrice, no_price: noPrice }}
          userBalance={balance}
          optionPools={displayedOptionPools}
          onBetSuccess={handleBetSuccess}
        />
      )}
    </>
  )
}
