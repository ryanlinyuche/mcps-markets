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

export function FeaturedCarousel() {
  const [markets, setMarkets] = useState<FeaturedMarket[]>([])
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/markets/featured')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) setMarkets(d) })
      .catch(() => {})
  }, [])

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
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm flex flex-col" style={{ minHeight: 280 }}>

      {/* ── Slide track ── */}
      <div className="flex-1 overflow-hidden">
        <div
          className="flex h-full"
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
            const t = slide.yes_pool + slide.no_pool
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
                <h2 className="text-lg sm:text-xl font-bold leading-snug line-clamp-4 flex-1">
                  {slide.title}
                </h2>

                {/* YES / NO rows */}
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
                  {t > 0 && (
                    <span className="flex items-center gap-1">
                      <CoinDisplay amount={t} size="sm" /> vol
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

      {/* ── Bottom bar ── */}
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
