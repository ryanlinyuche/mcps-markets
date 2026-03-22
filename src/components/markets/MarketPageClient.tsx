'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Market, OptionPool, Position } from '@/types'
import { BettingPanel } from './BettingPanel'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { Info, ImagePlus, ShieldCheck, Send, Clock, TrendingUp, Pencil, Trash2, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { CommentsSection } from './CommentsSection'

// ─── Theme hook ───────────────────────────────────────────────────────────────
function useIsDark() {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return isDark
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface HistoryPoint { yes_pool: number; no_pool: number; recorded_at: string }
interface ScoreHistoryPoint { snapshot: string; recorded_at: string }
interface SimilarMarket { id: number; title: string; yes_pool: number; no_pool: number; market_type: string; status: string; yes_price?: number; no_price?: number }

const PALETTE = ['#38bdf8', '#f97316', '#34d399', '#a78bfa', '#fbbf24']

// ─── Odds Chart ───────────────────────────────────────────────────────────────
function OddsChart({ history }: { history: HistoryPoint[] }) {
  const isDark = useIsDark()
  const [tooltip, setTooltip] = useState<{ x: number; y: number; pct: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const W = 600, H = 160, PAD_LEFT = 36, PAD_RIGHT = 8, PAD_TOP = 8, PAD_BOTTOM = 20
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
  const color = isDark
    ? (last >= 60 ? '#38bdf8' : last <= 40 ? '#f97316' : '#6366f1')
    : (last >= 60 ? '#16a34a' : last <= 40 ? '#dc2626' : '#4f46e5')
  const gridColor = isDark ? '#1e2a3a' : '#e5e7eb'
  const gridTextColor = isDark ? '#4a6080' : '#9ca3af'
  const tooltipBg = isDark ? '#0d1526' : '#1f2937'

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (isPlaceholder || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const relX = Math.max(0, Math.min(1, (svgX - PAD_LEFT) / (W - PAD_LEFT - PAD_RIGHT)))
    const idx = Math.round(relX * (points.length - 1))
    setTooltip({ x: toX(idx), y: toY(points[idx]), pct: points[idx] })
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-2">
      <div className="flex justify-between items-center">
        <p className="text-xs font-medium text-muted-foreground">YES probability over time</p>
        <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{ color, background: color + '20' }}>
          {Math.round(last)}%
        </span>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="none"
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
        {[0, 50, 100].map(v => {
          if (v < minV - 5 || v > maxV + 5) return null
          const y = toY(v)
          return (
            <g key={v}>
              <line x1={PAD_LEFT - 4} y1={y} x2={W - PAD_RIGHT} y2={y} stroke={gridColor} strokeWidth="1" strokeDasharray={v === 50 ? '4,4' : '2,2'} />
              <text x={PAD_LEFT - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill={gridTextColor}>{v}%</text>
            </g>
          )
        })}
        {!isPlaceholder && <path d={areaPath} fill={color} fillOpacity="0.1" />}
        <path d={linePath} fill="none" stroke={isPlaceholder ? gridColor : color} strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" strokeDasharray={isPlaceholder ? '6,4' : undefined} />
        {!isPlaceholder && <circle cx={toX(points.length - 1)} cy={toY(last)} r="4" fill={color} />}
        {tooltip && (
          <g>
            <line x1={tooltip.x} y1={PAD_TOP} x2={tooltip.x} y2={H - PAD_BOTTOM} stroke={gridTextColor} strokeWidth="1" strokeDasharray="3,2" />
            <circle cx={tooltip.x} cy={tooltip.y} r="4" fill={color} />
            <rect x={Math.min(tooltip.x + 6, W - 70)} y={tooltip.y - 16} width={62} height={18} rx="4" fill={tooltipBg} fillOpacity="0.9" />
            <text x={Math.min(tooltip.x + 9, W - 67)} y={tooltip.y - 3} fontSize="10" fill="white">{Math.round(tooltip.pct)}% YES</text>
          </g>
        )}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        {isPlaceholder
          ? <span className="italic">Chart appears after the first bet</span>
          : <><span>Started {Math.round(first)}%</span><span>{history.length} data points</span></>}
      </div>
    </div>
  )
}

// ─── Score Chart ──────────────────────────────────────────────────────────────
function ScoreChart({ history, options }: { history: ScoreHistoryPoint[]; options: string[] }) {
  const isDark = useIsDark()
  const W = 600, H = 140, PAD_LEFT = 36, PAD_RIGHT = 8, PAD_TOP = 8, PAD_BOTTOM = 20
  const gridColor = isDark ? '#1e2a3a' : '#e5e7eb'
  const gridTextColor = isDark ? '#4a6080' : '#9ca3af'

  if (history.length < 2) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs font-medium text-muted-foreground mb-3">Option percentages over time</p>
        <div className="h-24 flex items-center justify-center">
          <p className="text-xs text-muted-foreground italic">Chart appears after the first bet</p>
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
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Option percentages over time</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36" preserveAspectRatio="none">
        {[0, 50, 100].map(v => (
          <g key={v}>
            <line x1={PAD_LEFT} y1={toY(v)} x2={W - PAD_RIGHT} y2={toY(v)} stroke={gridColor} strokeWidth="1" strokeDasharray={v === 50 ? '4,4' : '2,2'} />
            <text x={PAD_LEFT - 6} y={toY(v) + 3.5} textAnchor="end" fontSize="9" fill={gridTextColor}>{v}%</text>
          </g>
        ))}
        {allPoints.map((pts, i) => {
          const color = PALETTE[i % PALETTE.length]
          const d = pts.map((v, j) => `${j === 0 ? 'M' : 'L'} ${toX(j).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ')
          return <path key={options[i]} d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
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

// ─── Options Table (Polymarket-style rows) ────────────────────────────────────
function OptionsTable({
  market, optionPools, selectedSide, onSelectSide,
}: {
  market: Market
  optionPools?: OptionPool[]
  selectedSide: string
  onSelectSide: (side: string) => void
}) {
  const isScore = (market.market_type === 'score' || market.market_type === 'personal_score') && market.score_subtype !== 'overunder'
  const isSports = market.market_type === 'sports'
  const isOverUnder = market.score_subtype === 'overunder' || market.market_type === 'sat_act'
  const yesLabel = isSports && market.team_a ? market.team_a : isOverUnder && market.score_threshold ? `Over ${market.score_threshold}` : 'YES'
  const noLabel = isSports && market.team_b ? market.team_b : isOverUnder && market.score_threshold ? `Under ${market.score_threshold}` : 'NO'

  if (isScore && optionPools && optionPools.length > 0) {
    const total = optionPools.reduce((s, o) => s + o.amount, 0)
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-semibold">Options</p>
        </div>
        {optionPools.map(opt => {
          const pct = total === 0 ? Math.round(100 / optionPools.length) : Math.round((opt.amount / total) * 100)
          const isSelected = selectedSide === opt.label
          return (
            <div key={opt.label} className={`flex items-center gap-4 px-5 py-3 border-b border-border last:border-0 transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.amount.toLocaleString()} coins</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{pct}%</p>
              </div>
              <button
                onClick={() => onSelectSide(opt.label)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-primary/10 text-primary hover:bg-primary/20 dark:bg-sky-500/10 dark:text-sky-400 dark:hover:bg-sky-500/20'
                }`}
              >
                Buy
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  // YES/NO table
  const yesPct = Math.round((market.yes_price ?? 0.5) * 100)
  const noPct = 100 - yesPct
  const yesPool = market.yes_pool
  const noPool = market.no_pool

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <p className="text-sm font-semibold">Options</p>
      </div>
      {[
        { side: 'YES', label: yesLabel, pct: yesPct, pool: yesPool, colorClass: 'text-green-600 dark:text-sky-400', bgClass: 'bg-green-600 dark:bg-sky-500', indicatorClass: 'bg-green-600 dark:bg-sky-500', lightBg: 'bg-green-50 dark:bg-sky-500/10 text-green-700 dark:text-sky-300 hover:bg-green-100 dark:hover:bg-sky-500/20' },
        { side: 'NO',  label: noLabel,  pct: noPct,  pool: noPool,  colorClass: 'text-red-600 dark:text-orange-400', bgClass: 'bg-red-600 dark:bg-orange-500', indicatorClass: 'bg-red-600 dark:bg-orange-500', lightBg: 'bg-red-50 dark:bg-orange-500/10 text-red-700 dark:text-orange-300 hover:bg-red-100 dark:hover:bg-orange-500/20' },
      ].map(({ side, label, pct, pool, colorClass, bgClass, indicatorClass, lightBg }) => (
        <div key={side} className="flex items-center gap-4 px-5 py-3 border-b border-border last:border-0 transition-colors hover:bg-muted/30">
          <div className={`w-2 h-8 rounded-full flex-shrink-0 ${indicatorClass}`} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-muted-foreground">{pool.toLocaleString()} coins</p>
          </div>
          <p className={`text-xl font-bold ${colorClass}`}>{pct}%</p>
          <button
            onClick={() => onSelectSide(side)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              selectedSide === side
                ? `${bgClass} text-white`
                : lightBg
            }`}
          >
            Buy {label}
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Resolution Info ──────────────────────────────────────────────────────────
function ResolutionInfo({ market }: { market: Market }) {
  const hasInfo = !!(market.resolution_criteria || market.resolution_source)
  const isResolved = market.status === 'resolved'
  const isPending = market.status === 'pending_resolution'
  if (!hasInfo && !isResolved && !isPending) return null

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Info size={15} className="text-muted-foreground" />
        <h3 className="text-sm font-semibold">Resolution Info</h3>
      </div>
      {market.resolution_criteria && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Criteria</p>
          <p className="text-sm">{market.resolution_criteria}</p>
        </div>
      )}
      {market.resolution_source && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Source</p>
          <p className="text-sm">{market.resolution_source}</p>
        </div>
      )}
      {isResolved && (
        <div className={`${hasInfo ? 'pt-3 border-t border-border' : ''} space-y-2`}>
          {market.resolution_notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Admin Notes</p>
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
                  className="rounded-xl border border-border max-h-64 w-full object-contain bg-muted hover:opacity-90 transition-opacity cursor-pointer" />
              </a>
            </div>
          )}
        </div>
      )}
      {isPending && market.resolution_proof && (
        <div className={`${hasInfo ? 'pt-3 border-t border-border' : ''} space-y-1`}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Submitted Proof</p>
          <a href={market.resolution_proof} target="_blank" rel="noopener noreferrer">
            <img src={market.resolution_proof} alt="Resolution proof"
              className="rounded-xl border border-border max-h-48 w-full object-contain bg-muted hover:opacity-90 transition-opacity cursor-pointer" />
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Request Resolution ───────────────────────────────────────────────────────
function RequestResolutionPanel({ market, optionPools, isCreator, onResolutionRequested }: {
  market: Market; optionPools?: OptionPool[]; isCreator: boolean; onResolutionRequested: () => void
}) {
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const proofInputRef = useRef<HTMLInputElement>(null)

  const isScore = (market.market_type === 'score' || market.market_type === 'personal_score') && market.score_subtype !== 'overunder'
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
      if (res.ok) { toast.success('Resolution submitted — awaiting admin approval'); onResolutionRequested() }
      else toast.error(data.error || 'Failed to submit')
    } catch { toast.error('Something went wrong') }
    setSubmitting(false)
  }

  if (market.status === 'pending_resolution') {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">Resolution Pending Admin Approval</p>
        </div>
        <p className="text-sm text-amber-800 dark:text-amber-400">
          Proposed: <span className="font-bold">{market.pending_outcome}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-primary" />
        <p className="text-sm font-semibold">Request Resolution</p>
        <span className="text-xs text-muted-foreground">{isCreator ? '(you created this)' : '— upload proof'}</span>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">1. Select outcome</p>
        <div className="flex flex-wrap gap-2">
          {outcomeOptions.map(opt => (
            <button key={opt} onClick={() => setSelectedOutcome(opt === selectedOutcome ? null : opt)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                selectedOutcome === opt ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
              }`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {selectedOutcome && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">2. Upload proof</p>
          <input ref={proofInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
          <button onClick={() => proofInputRef.current?.click()}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all ${
              proofFile ? 'border-green-500 text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-500/10' : 'border-dashed border-border hover:bg-muted text-muted-foreground'
            }`}>
            <ImagePlus size={15} />
            {proofFile ? proofFile.name : 'Choose image'}
          </button>
          {proofFile && (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium disabled:opacity-50 transition-all">
              <Send size={15} />
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Similar Markets ──────────────────────────────────────────────────────────
function SimilarMarkets({ markets }: { markets: SimilarMarket[] }) {
  if (markets.length === 0) return null
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <TrendingUp size={14} className="text-muted-foreground" />
        <p className="text-sm font-semibold">Similar Markets</p>
      </div>
      <div className="divide-y divide-border">
        {markets.map(m => {
          const yesPct = Math.round((m.yes_price ?? 0.5) * 100)
          return (
            <Link key={m.id} href={`/markets/${m.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
              <p className="flex-1 text-sm font-medium leading-snug line-clamp-2">{m.title}</p>
              <span className="text-sm font-bold text-green-600 dark:text-sky-400 shrink-0">{yesPct}%</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────
interface Props {
  initialMarket: Market
  userBalance: number
  initialOptionPools?: OptionPool[]
  initialHistory?: HistoryPoint[]
  userPositions?: Position[]
  similarMarkets?: SimilarMarket[]
  isLoggedIn: boolean
  isCreator?: boolean
  isAdmin?: boolean
  commentsRestricted?: boolean
}

export function MarketPageClient({
  initialMarket, userBalance, initialOptionPools, initialHistory = [],
  userPositions = [], similarMarkets = [],
  isLoggedIn, isCreator = false, isAdmin = false, commentsRestricted = false,
}: Props) {
  const router = useRouter()
  const [market, setMarket] = useState(initialMarket)
  const [optionPools, setOptionPools] = useState(initialOptionPools)
  const [history, setHistory] = useState<HistoryPoint[]>(initialHistory)
  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryPoint[]>([])
  const [balance, setBalance] = useState(userBalance)
  const [selectedSide, setSelectedSide] = useState<string>(
    (initialOptionPools?.[0]?.label) ?? 'YES'
  )

  const isScore = (market.market_type === 'score' || market.market_type === 'personal_score') && market.score_subtype !== 'overunder'
  const bettingClosed = market.status === 'open' && !!market.closes_at && new Date(market.closes_at) < new Date()
  const showResolutionPanel = isLoggedIn && (market.status === 'open' || (isCreator && market.status === 'pending_resolution'))

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showProofUpload, setShowProofUpload] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const proofInputRef = useRef<HTMLInputElement>(null)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/markets/${initialMarket.id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Failed to delete market'); setDeleting(false); return }
      toast.success('Market deleted — all bets refunded')
      router.push('/markets')
    } catch {
      toast.error('Something went wrong')
      setDeleting(false)
    }
  }

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
      fetch(`/api/markets/${initialMarket.id}/history`).then(r => r.json()).then(setScoreHistory).catch(() => {})
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

  async function handleUpdateProof() {
    if (!proofFile) return
    setUploadingProof(true)
    try {
      const fd = new FormData()
      fd.append('file', proofFile)
      const res = await fetch(`/api/admin/markets/${initialMarket.id}/update-proof`, { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        toast.success('Proof updated')
        setShowProofUpload(false)
        setProofFile(null)
        refetch()
      } else {
        toast.error(data.error || 'Failed to update proof')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setUploadingProof(false)
    }
  }

  const yesPrice = market.yes_price ?? (market.yes_pool / (market.yes_pool + market.no_pool) || 0.5)
  const noPrice = market.no_price ?? (market.no_pool / (market.yes_pool + market.no_pool) || 0.5)
  const displayedOptionPools = isScore && optionPools
    ? optionPools.map(o => {
        const total = optionPools.reduce((s, x) => s + x.amount, 0)
        return { ...o, market_id: initialMarket.id, price: total === 0 ? 1 / optionPools.length : o.amount / total }
      })
    : optionPools
  const optionLabels = optionPools?.map(o => o.label) ?? []

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start">
      {/* ── Left column ── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Personal score banner */}
        {market.market_type === 'personal_score' && market.subject_name && (
          <div className="rounded-2xl border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 px-4 py-3 flex items-center gap-2">
            <span>📊</span>
            <p className="text-sm font-medium text-purple-800 dark:text-purple-300">
              Predicts <span className="font-bold">{market.subject_name}</span>&apos;s personal score
            </p>
          </div>
        )}

        {/* Chart */}
        {isScore
          ? <ScoreChart history={scoreHistory} options={optionLabels} />
          : <OddsChart history={history} />
        }

        {/* Resolved outcome */}
        {market.status === 'resolved' && market.outcome && (
          <div className={`rounded-2xl p-5 text-center font-bold text-xl border ${
            market.outcome === 'N/A'
              ? 'bg-muted border-border text-muted-foreground'
              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
          }`}>
            Resolved: {market.outcome}
            {market.outcome === 'N/A' && <span className="block text-sm font-normal text-muted-foreground mt-1">All bets refunded</span>}
          </div>
        )}

        {/* Status banners */}
        {market.status === 'pending_resolution' && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-400">
            <Clock size={15} className="shrink-0" />
            Betting closed — resolution pending admin approval
          </div>
        )}
        {bettingClosed && market.status !== 'pending_resolution' && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-400">
            <Clock size={15} className="shrink-0" />
            Betting closed — awaiting resolution
          </div>
        )}

        {/* Options table */}
        {market.status !== 'resolved' && (
          <OptionsTable
            market={{ ...market, yes_price: yesPrice, no_price: noPrice }}
            optionPools={displayedOptionPools}
            selectedSide={selectedSide}
            onSelectSide={setSelectedSide}
          />
        )}

        {/* Resolution info */}
        <ResolutionInfo market={market} />

        {/* Resolution panel */}
        {showResolutionPanel && (
          <RequestResolutionPanel
            market={market}
            optionPools={optionPools}
            isCreator={isCreator}
            onResolutionRequested={refetch}
          />
        )}

        {/* Comments */}
        <CommentsSection
          marketId={initialMarket.id}
          isAdmin={isAdmin}
          isLoggedIn={isLoggedIn}
          commentsRestricted={commentsRestricted || market.comments_restricted === 1}
        />
      </div>

      {/* ── Right column (sticky) ── */}
      <div className="xl:w-96 w-full space-y-4 xl:sticky xl:top-20">
        {/* Betting panel */}
        {!bettingClosed && market.status !== 'pending_resolution' ? (
          isLoggedIn ? (
            <BettingPanel
              market={{ ...market, yes_price: yesPrice, no_price: noPrice }}
              userBalance={balance}
              optionPools={displayedOptionPools}
              selectedSide={selectedSide}
              onSideChange={setSelectedSide}
              onBetSuccess={handleBetSuccess}
            />
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
              <p className="font-semibold">Sign in to trade</p>
              <a href="/login" className="block w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-bold hover:bg-primary/90 transition-all">
                Log in
              </a>
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
            {market.status === 'resolved' ? `Market resolved: ${market.outcome}` : 'Betting is closed'}
          </div>
        )}

        {/* User positions */}
        {userPositions.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm">Your Positions</h3>
            {userPositions.map(pos => (
              <div key={pos.id} className="flex justify-between items-center text-sm rounded-xl bg-muted/50 px-3 py-2">
                <span className={
                  pos.side === 'YES' ? 'text-green-600 dark:text-sky-400 font-semibold' :
                  pos.side === 'NO' ? 'text-red-600 dark:text-orange-400 font-semibold' :
                  'font-semibold text-purple-600 dark:text-purple-400'
                }>
                  {pos.side}
                </span>
                <CoinDisplay amount={pos.coins_bet} size="sm" />
              </div>
            ))}
          </div>
        )}

        {/* Edit / Delete — admin or creator */}
        {(isAdmin || isCreator) && market.status !== 'resolved' && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {isAdmin ? 'Admin Actions' : 'Your Market'}
            </p>
            <Link
              href={`/markets/${initialMarket.id}/edit`}
              className="flex items-center gap-2 w-full rounded-xl border border-border bg-muted/50 hover:bg-muted px-3 py-2.5 text-sm font-medium transition-colors"
            >
              <Pencil size={14} /> Edit Market Details
            </Link>
            {isAdmin && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 w-full rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 px-3 py-2.5 text-sm font-medium text-red-700 dark:text-red-400 transition-colors"
              >
                <Trash2 size={14} /> Delete Market
              </button>
            )}
            {isAdmin && confirmDelete && (
              <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3 space-y-2">
                <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                  Delete this market? All bets will be refunded. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin: Update Proof (resolved markets) */}
        {isAdmin && market.status === 'resolved' && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin Actions</p>
            <input ref={proofInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => setProofFile(e.target.files?.[0] ?? null)} />
            {!showProofUpload ? (
              <button
                onClick={() => setShowProofUpload(true)}
                className="flex items-center gap-2 w-full rounded-xl border border-border bg-muted/50 hover:bg-muted px-3 py-2.5 text-sm font-medium transition-colors"
              >
                <UploadCloud size={14} /> Update Resolution Proof
              </button>
            ) : (
              <div className="space-y-2">
                <button onClick={() => proofInputRef.current?.click()}
                  className={`flex items-center gap-2 w-full rounded-xl border text-sm px-3 py-2.5 transition-all ${
                    proofFile ? 'border-green-500 text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-500/10' : 'border-dashed border-border hover:bg-muted text-muted-foreground'
                  }`}>
                  <ImagePlus size={14} />
                  {proofFile ? proofFile.name : 'Choose image (max 5MB)'}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowProofUpload(false); setProofFile(null) }}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateProof}
                    disabled={!proofFile || uploadingProof}
                    className="flex-1 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 hover:bg-primary/90"
                  >
                    {uploadingProof ? 'Uploading…' : 'Upload Proof'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Similar markets */}
        <SimilarMarkets markets={similarMarkets} />
      </div>
    </div>
  )
}
