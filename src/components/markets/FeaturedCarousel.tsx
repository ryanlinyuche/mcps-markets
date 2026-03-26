'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CoinDisplay } from '@/components/shared/CoinDisplay'

interface FeaturedMarket {
  id: number
  title: string
  description: string | null
  yes_pool: number
  no_pool: number
  yes_price: number
  no_price: number
  closes_at: string | null
  school: string
  creator_name: string
}

interface HistoryPoint { yes_pool: number; no_pool: number; recorded_at: string }

// ── Inline mini odds chart ────────────────────────────────────────────────────
function MiniChart({ history, yesPct }: { history: HistoryPoint[]; yesPct: number }) {
  const W = 500, H = 160, PL = 28, PR = 8, PT = 8, PB = 24

  const points = history.length >= 2
    ? history.map(h => {
        const t = h.yes_pool + h.no_pool
        return t === 0 ? 50 : (h.yes_pool / t) * 100
      })
    : null

  const color = yesPct >= 60 ? '#16a34a' : yesPct <= 40 ? '#dc2626' : '#4f46e5'
  const colorDark = yesPct >= 60 ? '#38bdf8' : yesPct <= 40 ? '#f97316' : '#818cf8'
  const gridColor = 'currentColor'

  if (!points) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/40 text-xs italic gap-2 min-h-[160px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32 opacity-20" preserveAspectRatio="none">
          <line x1={PL} y1={(PT + H - PB) / 2} x2={W - PR} y2={(PT + H - PB) / 2}
            stroke="currentColor" strokeWidth="2" strokeDasharray="8,6" />
        </svg>
        <span>Chart appears after first bet</span>
      </div>
    )
  }

  const minV = Math.max(0, Math.min(...points) - 8)
  const maxV = Math.min(100, Math.max(...points) + 8)
  const range = Math.max(maxV - minV, 10)
  const toX = (i: number) => PL + (i / Math.max(points.length - 1, 1)) * (W - PL - PR)
  const toY = (v: number) => PT + ((maxV - v) / range) * (H - PT - PB)
  const last = points[points.length - 1]
  const linePath = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${toX(points.length - 1).toFixed(1)} ${H - PB} L ${toX(0).toFixed(1)} ${H - PB} Z`

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-1 px-1">
        <p className="text-xs text-muted-foreground">YES probability</p>
        <span className="text-xs font-bold" style={{ color }}>
          {Math.round(last)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1" preserveAspectRatio="none">
        {[0, 50, 100].map(v => {
          if (v < minV - 5 || v > maxV + 5) return null
          const y = toY(v)
          return (
            <g key={v}>
              <line x1={PL - 4} y1={y} x2={W - PR} y2={y}
                stroke={gridColor} strokeOpacity="0.12" strokeWidth="1"
                strokeDasharray={v === 50 ? '4,4' : '2,2'} />
              <text x={PL - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill={gridColor} fillOpacity="0.4">{v}%</text>
            </g>
          )
        })}
        <path d={areaPath} fill={color} fillOpacity="0.08" className="dark:hidden" />
        <path d={areaPath} fill={colorDark} fillOpacity="0.12" className="hidden dark:block" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" className="dark:hidden" />
        <path d={linePath} fill="none" stroke={colorDark} strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" className="hidden dark:block" />
        <circle cx={toX(points.length - 1)} cy={toY(last)} r="4" fill={color} className="dark:hidden" />
        <circle cx={toX(points.length - 1)} cy={toY(last)} r="4" fill={colorDark} className="hidden dark:block" />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground/50 px-1 mt-0.5">
        <span>{history.length} data pts</span>
        <span>{new Date(history[history.length - 1].recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  )
}

// ── Main carousel ─────────────────────────────────────────────────────────────
export function FeaturedCarousel() {
  const [markets, setMarkets] = useState<FeaturedMarket[]>([])
  const [current, setCurrent] = useState(0)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/markets/featured')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) setMarkets(d) })
      .catch(() => {})
  }, [])

  // Fetch history whenever displayed market changes
  useEffect(() => {
    if (!markets[current]) return
    setHistory([])
    fetch(`/api/markets/${markets[current].id}/history`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setHistory(d) })
      .catch(() => {})
  }, [markets, current])

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % markets.length)
    }, 6000)
  }, [markets.length])

  useEffect(() => {
    if (markets.length <= 1) return
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [markets.length, startTimer])

  const go = useCallback((idx: number) => {
    setCurrent(idx)
    startTimer()
  }, [startTimer])

  const prev = () => go((current - 1 + markets.length) % markets.length)
  const next = () => go((current + 1) % markets.length)

  if (markets.length === 0) return null

  const m = markets[current]
  const yesPct = Math.round(m.yes_price * 100)
  const noPct = 100 - yesPct
  const total = m.yes_pool + m.no_pool

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="flex flex-col sm:flex-row" style={{ minHeight: 320 }}>

        {/* ── Left: sliding carousel ── */}
        <div className="sm:w-1/2 overflow-hidden border-b sm:border-b-0 sm:border-r border-border flex flex-col">
          {/* Slide track */}
          <div
            className="flex flex-1"
            style={{
              width: `${markets.length * 100}%`,
              transform: `translateX(-${current * (100 / markets.length)}%)`,
              transition: 'transform 380ms cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform',
            }}
          >
            {markets.map((slide, i) => (
              <div
                key={slide.id}
                className="flex flex-col px-6 py-7 space-y-5"
                style={{ width: `${100 / markets.length}%` }}
                aria-hidden={i !== current}
              >
                {/* Badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    🔥 Featured
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{slide.school}</span>
                </div>

                {/* Title */}
                <h2 className="text-lg sm:text-xl font-bold leading-snug flex-1 line-clamp-4">{slide.title}</h2>

                {/* Description */}
                {slide.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 -mt-2">{slide.description}</p>
                )}

                {/* Odds bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-green-600 dark:text-sky-400">YES {Math.round(slide.yes_price * 100)}%</span>
                    <span className="text-red-500 dark:text-orange-400">NO {100 - Math.round(slide.yes_price * 100)}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                    <div className="bg-green-500 dark:bg-sky-500 h-full rounded-l-full transition-all duration-700"
                      style={{ width: `${Math.round(slide.yes_price * 100)}%` }} />
                    <div className="bg-red-400 dark:bg-orange-400 h-full rounded-r-full transition-all duration-700"
                      style={{ width: `${100 - Math.round(slide.yes_price * 100)}%` }} />
                  </div>
                </div>

                {/* Meta */}
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {(slide.yes_pool + slide.no_pool) > 0 && (
                    <span className="flex items-center gap-1">
                      <CoinDisplay amount={slide.yes_pool + slide.no_pool} size="sm" /> wagered
                    </span>
                  )}
                  {slide.closes_at && (
                    <span>Closes {new Date(slide.closes_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}</span>
                  )}
                  <span>by {slide.creator_name}</span>
                </div>

                {/* CTA */}
                <Link
                  href={`/markets/${slide.id}`}
                  className="w-full inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold hover:bg-primary/90 active:scale-95 transition-all"
                  tabIndex={i !== current ? -1 : undefined}
                >
                  View Market →
                </Link>
              </div>
            ))}
          </div>

          {/* Nav controls */}
          {markets.length > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <button onClick={prev}
                className="w-7 h-7 flex items-center justify-center rounded-full border border-border bg-background hover:bg-muted transition-colors"
                aria-label="Previous">
                <ChevronLeft size={13} />
              </button>
              <div className="flex items-center gap-1.5">
                {markets.map((_, i) => (
                  <button key={i} onClick={() => go(i)} aria-label={`Slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === current ? 'bg-primary w-5' : 'bg-muted-foreground/35 w-1.5 hover:bg-muted-foreground/60'
                    }`} />
                ))}
              </div>
              <button onClick={next}
                className="w-7 h-7 flex items-center justify-center rounded-full border border-border bg-background hover:bg-muted transition-colors"
                aria-label="Next">
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* ── Right: odds chart for current market ── */}
        <div className="sm:w-1/2 flex flex-col px-5 py-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {m.title.length > 48 ? m.title.slice(0, 48) + '…' : m.title}
          </p>
          <MiniChart history={history} yesPct={yesPct} />
          {/* Current odds summary */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-0.5">YES</p>
              <p className="text-xl font-bold text-green-600 dark:text-sky-400">{yesPct}%</p>
              <CoinDisplay amount={m.yes_pool} size="sm" />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-0.5">NO</p>
              <p className="text-xl font-bold text-red-500 dark:text-orange-400">{noPct}%</p>
              <CoinDisplay amount={m.no_pool} size="sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
