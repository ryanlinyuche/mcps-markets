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

  return (
    <div className="relative">
        {/* Card shell */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm" style={{ minHeight: 320 }}>

          {/* Slide track — total width = N × container width */}
          <div
            style={{
              display: 'flex',
              width: `${markets.length * 100}%`,
              transform: `translateX(-${current * (100 / markets.length)}%)`,
              transition: 'transform 380ms cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform',
            }}
          >
            {markets.map((m, i) => {
              const yesPct = Math.round(m.yes_price * 100)
              const noPct = 100 - yesPct
              const total = m.yes_pool + m.no_pool

              return (
                <div
                  key={m.id}
                  className="flex flex-col px-6 py-7 space-y-5"
                  style={{ width: `${100 / markets.length}%`, minHeight: 320 }}
                  aria-hidden={i !== current}
                >
                  {/* Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      🔥 Featured
                    </span>
                    <span className="text-xs text-muted-foreground truncate">{m.school}</span>
                  </div>

                  {/* Title — grows to fill */}
                  <h2 className="text-lg sm:text-xl font-bold leading-snug flex-1 line-clamp-4">{m.title}</h2>

                  {/* Description preview */}
                  {m.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 -mt-2">{m.description}</p>
                  )}

                  {/* Odds bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-green-600 dark:text-sky-400">YES {yesPct}%</span>
                      <span className="text-red-500 dark:text-orange-400">NO {noPct}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                      <div
                        className="bg-green-500 dark:bg-sky-500 h-full rounded-l-full transition-all duration-700"
                        style={{ width: `${yesPct}%` }}
                      />
                      <div
                        className="bg-red-400 dark:bg-orange-400 h-full rounded-r-full transition-all duration-700"
                        style={{ width: `${noPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {total > 0 && (
                      <span className="flex items-center gap-1">
                        <CoinDisplay amount={total} size="sm" /> wagered
                      </span>
                    )}
                    {m.closes_at && (
                      <span>
                        Closes {new Date(m.closes_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                        })}
                      </span>
                    )}
                    <span>by {m.creator_name}</span>
                  </div>

                  {/* CTA */}
                  <Link
                    href={`/markets/${m.id}`}
                    className="w-full inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold hover:bg-primary/90 active:scale-95 transition-all"
                    tabIndex={i !== current ? -1 : undefined}
                  >
                    View Market →
                  </Link>
                </div>
              )
            })}
          </div>

          {/* Dots + arrows — only when multiple */}
          {markets.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 pb-3 pt-6 bg-gradient-to-t from-card via-card/80 to-transparent">
              <button
                onClick={prev}
                className="w-7 h-7 flex items-center justify-center rounded-full border border-border bg-background/90 shadow-sm hover:bg-muted transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft size={13} />
              </button>

              <div className="flex items-center gap-1.5">
                {markets.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => go(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === current
                        ? 'bg-primary w-5'
                        : 'bg-muted-foreground/35 w-1.5 hover:bg-muted-foreground/60'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={next}
                className="w-7 h-7 flex items-center justify-center rounded-full border border-border bg-background/90 shadow-sm hover:bg-muted transition-colors"
                aria-label="Next"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
    </div>
  )
}
