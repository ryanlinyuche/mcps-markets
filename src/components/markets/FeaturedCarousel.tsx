'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CoinDisplay } from '@/components/shared/CoinDisplay'

interface FeaturedMarket {
  id: number
  title: string
  description: string | null
  market_type: string
  yes_pool: number
  no_pool: number
  yes_price: number
  no_price: number
  closes_at: string | null
  school: string
  creator_name: string
}

const TYPE_LABELS: Record<string, string> = {
  sports: 'Sports',
  score: 'Score',
  personal_score: 'Score',
  sat_act: 'SAT / ACT',
  teacher_quote: 'Teacher Quote',
  custom: 'Custom',
}

export function FeaturedCarousel() {
  const [markets, setMarkets] = useState<FeaturedMarket[]>([])
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef = useRef(0)

  useEffect(() => {
    fetch('/api/markets/featured')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) setMarkets(d) })
      .catch(() => {})
  }, [])

  const startTimer = useCallback((count: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (count <= 1) return
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % count)
    }, 6000)
  }, [])

  useEffect(() => {
    countRef.current = markets.length
    startTimer(markets.length)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [markets.length, startTimer])

  const go = useCallback((idx: number) => {
    setCurrent(idx)
    startTimer(countRef.current)
  }, [startTimer])

  const prev = () => go((current - 1 + markets.length) % markets.length)
  const next = () => go((current + 1) % markets.length)

  if (markets.length === 0) return null

  const n = markets.length

  return (
    <div
      className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col"
      style={{ minHeight: 280 }}
    >
      {/* Slide track */}
      <div className="flex-1 overflow-hidden">
        <div
          className="flex h-full"
          style={{
            width: `${n * 100}%`,
            transform: `translateX(-${current * (100 / n)}%)`,
            transition: 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform',
          }}
        >
          {markets.map((m, i) => {
            const yesPct = Math.round(m.yes_price * 100)
            const noPct = 100 - yesPct
            const total = m.yes_pool + m.no_pool
            const typeLabel = TYPE_LABELS[m.market_type] ?? m.market_type
            return (
              <div
                key={m.id}
                className="flex flex-col px-6 pt-6 pb-5 gap-4"
                style={{ width: `${100 / n}%` }}
                aria-hidden={i !== current}
              >
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    🔥 Featured
                  </span>
                  {typeLabel && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border border-border text-muted-foreground">
                      {typeLabel}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h2 className="text-lg sm:text-xl font-bold leading-snug line-clamp-3 flex-1">
                  {m.title}
                </h2>

                {/* YES / NO with progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-green-600 dark:text-green-400">YES {yesPct}%</span>
                    <span className="text-red-500 dark:text-red-400">NO {noPct}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-muted flex">
                    <div
                      className="bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${yesPct}%` }}
                    />
                    <div
                      className="bg-red-400 flex-1 rounded-full"
                    />
                  </div>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {total > 0 && (
                    <span className="flex items-center gap-1">
                      <CoinDisplay amount={total} size="sm" /> wagered
                    </span>
                  )}
                  {m.closes_at && (
                    <span>· Closes {new Date(m.closes_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                  )}
                  {m.creator_name && (
                    <span>· by {m.creator_name}</span>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href={`/markets/${m.id}`}
                  tabIndex={i !== current ? -1 : undefined}
                  className="self-start px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  View Market →
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      {/* Nav bar */}
      {n > 1 && (
        <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-border">
          <button
            onClick={prev}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft size={14} />
          </button>
          <div className="flex items-center gap-1.5">
            {markets.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? 'bg-primary w-5' : 'bg-muted-foreground/35 w-1.5'
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Next"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
