'use client'
import { useEffect, useState, useCallback } from 'react'
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

  useEffect(() => {
    fetch('/api/markets/featured').then(r => r.json()).then(d => {
      if (Array.isArray(d) && d.length > 0) setMarkets(d)
    }).catch(() => {})
  }, [])

  const next = useCallback(() => setCurrent(c => (c + 1) % markets.length), [markets.length])
  const prev = useCallback(() => setCurrent(c => (c - 1 + markets.length) % markets.length), [markets.length])

  useEffect(() => {
    if (markets.length <= 1) return
    const t = setInterval(next, 6000)
    return () => clearInterval(t)
  }, [markets.length, next])

  if (markets.length === 0) return null

  const m = markets[current]
  const yesPct = Math.round(m.yes_price * 100)
  const noPct = 100 - yesPct
  const total = m.yes_pool + m.no_pool

  return (
    <div className="relative rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-5 sm:p-7 space-y-4">
        {/* Label */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            🔥 Featured
          </span>
          <span className="text-xs text-muted-foreground">{m.school}</span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold leading-tight line-clamp-3">{m.title}</h2>

        {/* Odds bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-green-600 dark:text-sky-400">YES {yesPct}%</span>
            <span className="text-red-500 dark:text-orange-400">NO {noPct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
            <div
              className="bg-green-500 dark:bg-sky-500 h-full rounded-l-full transition-all duration-500"
              style={{ width: `${yesPct}%` }}
            />
            <div
              className="bg-red-400 dark:bg-orange-400 h-full rounded-r-full transition-all duration-500"
              style={{ width: `${noPct}%` }}
            />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
          {total > 0 && (
            <span className="flex items-center gap-1">
              <CoinDisplay amount={total} size="sm" /> wagered
            </span>
          )}
          {m.closes_at && (
            <span>
              Closes {new Date(m.closes_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>

        {/* CTA */}
        <Link
          href={`/markets/${m.id}`}
          className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          View Market →
        </Link>
      </div>

      {/* Navigation arrows (only if >1 market) */}
      {markets.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-background/80 border border-border shadow hover:bg-muted transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-background/80 border border-border shadow hover:bg-muted transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {markets.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? 'bg-primary w-4' : 'bg-muted-foreground/40 w-1.5'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
