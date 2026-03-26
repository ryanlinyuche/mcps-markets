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

// ── Clean Polymarket-style chart ──────────────────────────────────────────────
function OddsChart({ history, yesPct }: { history: HistoryPoint[]; yesPct: number }) {
  const W = 600, H = 200, PL = 0, PR = 36, PT = 12, PB = 8

  const color = yesPct >= 60 ? '#16a34a' : yesPct <= 40 ? '#ef4444' : '#6366f1'
  const colorDark = yesPct >= 60 ? '#38bdf8' : yesPct <= 40 ? '#f97316' : '#818cf8'

  if (history.length < 2) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground/30 text-xs italic">
        Chart appears after the first bet
      </div>
    )
  }

  const points = history.map(h => {
    const t = h.yes_pool + h.no_pool
    return t === 0 ? 50 : (h.yes_pool / t) * 100
  })

  const minV = Math.max(0, Math.min(...points) - 6)
  const maxV = Math.min(100, Math.max(...points) + 6)
  const range = Math.max(maxV - minV, 8)
  const toX = (i: number) => PL + (i / Math.max(points.length - 1, 1)) * (W - PL - PR)
  const toY = (v: number) => PT + ((maxV - v) / range) * (H - PT - PB)
  const last = points[points.length - 1]

  const linePath = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${toX(points.length - 1).toFixed(1)} ${H - PB} L ${toX(0).toFixed(1)} ${H - PB} Z`

  // Grid lines — only at meaningful %s that fall within range
  const gridLines = [20, 35, 50, 65, 80].filter(v => v > minV - 4 && v < maxV + 4)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      {/* Subtle grid lines */}
      {gridLines.map(v => (
        <g key={v}>
          <line
            x1={0} y1={toY(v)} x2={W - PR} y2={toY(v)}
            stroke="currentColor" strokeOpacity="0.06" strokeWidth="1"
            strokeDasharray={v === 50 ? '5,4' : '3,4'}
          />
          <text x={W - PR + 4} y={toY(v) + 4} fontSize="10" fill="currentColor" fillOpacity="0.35">{v}%</text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} className="dark:hidden" fill={color} fillOpacity="0.08" />
      <path d={areaPath} className="hidden dark:block" fill={colorDark} fillOpacity="0.1" />

      {/* Line */}
      <path d={linePath} fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
        stroke={color} className="dark:hidden" />
      <path d={linePath} fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
        stroke={colorDark} className="hidden dark:block" />

      {/* End dot */}
      <circle cx={toX(points.length - 1)} cy={toY(last)} r="4.5" fill={color} className="dark:hidden" />
      <circle cx={toX(points.length - 1)} cy={toY(last)} r="4.5" fill={colorDark} className="hidden dark:block" />
    </svg>
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

      {/* ── Main content row ── */}
      <div className="flex flex-col sm:flex-row" style={{ minHeight: 280 }}>

        {/* Left: slide track */}
        <div className="sm:w-5/12 overflow-hidden flex flex-col shrink-0">
          <div
            className="flex flex-1"
            style={{
              width: `${markets.length * 100}%`,
              transform: `translateX(-${current * (100 / markets.length)}%)`,
              transition: 'transform 380ms cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform',
            }}
          >
            {markets.map((slide, i) => {
              const yp = Math.round(slide.yes_price * 100)
              const np = 100 - yp
              return (
                <div
                  key={slide.id}
                  className="flex flex-col px-6 pt-6 pb-5 gap-4"
                  style={{ width: `${100 / markets.length}%` }}
                  aria-hidden={i !== current}
                >
                  {/* Badge + school */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      🔥 Featured
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{slide.school}</span>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg sm:text-xl font-bold leading-snug line-clamp-3 flex-1">
                    {slide.title}
                  </h2>

                  {/* YES / NO rows like Polymarket */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                      <span className="text-sm font-medium text-green-700 dark:text-sky-400">YES</span>
                      <span className="text-sm font-bold">{yp}%</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-sm font-medium text-red-600 dark:text-orange-400">NO</span>
                      <span className="text-sm font-bold">{np}%</span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {total > 0 && (
                      <span className="flex items-center gap-1">
                        <CoinDisplay amount={total} size="sm" /> vol
                      </span>
                    )}
                    {slide.closes_at && (
                      <span>· {new Date(slide.closes_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric',
                      })}</span>
                    )}
                  </div>

                  {/* CTA */}
                  <Link
                    href={`/markets/${slide.id}`}
                    className="self-start text-xs font-semibold text-primary hover:underline"
                    tabIndex={i !== current ? -1 : undefined}
                  >
                    View market →
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: chart — fills remaining space, no divider line */}
        <div className="flex-1 flex flex-col min-h-[200px] sm:min-h-0 pt-4 pr-2 pb-2 pl-0 overflow-hidden">
          <OddsChart history={history} yesPct={yesPct} />
        </div>
      </div>

      {/* ── Bottom bar: meta + nav ── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-muted/30">
        <span className="text-xs text-muted-foreground">
          {total > 0 ? <><CoinDisplay amount={total} size="sm" /> wagered</> : 'No bets yet'}
        </span>

        {markets.length > 1 ? (
          <div className="flex items-center gap-2">
            <button onClick={prev} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors" aria-label="Previous">
              <ChevronLeft size={13} />
            </button>
            <div className="flex items-center gap-1.5">
              {markets.map((_, i) => (
                <button key={i} onClick={() => go(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'bg-primary w-5' : 'bg-muted-foreground/35 w-1.5'}`} />
              ))}
            </div>
            <button onClick={next} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors" aria-label="Next">
              <ChevronRight size={13} />
            </button>
          </div>
        ) : <div />}

        <Link href={`/markets/${m.id}`} className="text-xs font-semibold text-primary hover:underline">
          Trade →
        </Link>
      </div>
    </div>
  )
}
