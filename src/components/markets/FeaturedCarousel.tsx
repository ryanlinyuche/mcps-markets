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
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'left' | 'right'>('right')
  const [displayed, setDisplayed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/markets/featured').then(r => r.json()).then(d => {
      if (Array.isArray(d) && d.length > 0) {
        setMarkets(d)
        setDisplayed(0)
        setCurrent(0)
      }
    }).catch(() => {})
  }, [])

  const goTo = useCallback((idx: number, dir: 'left' | 'right') => {
    if (animating) return
    setDirection(dir)
    setAnimating(true)
    setTimeout(() => {
      setDisplayed(idx)
      setCurrent(idx)
      setAnimating(false)
    }, 320)
  }, [animating])

  const next = useCallback(() => {
    if (markets.length <= 1) return
    goTo((current + 1) % markets.length, 'right')
  }, [current, markets.length, goTo])

  const prev = useCallback(() => {
    if (markets.length <= 1) return
    goTo((current - 1 + markets.length) % markets.length, 'left')
  }, [current, markets.length, goTo])

  // Auto-advance — reset timer on manual nav
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (markets.length <= 1) return
    timerRef.current = setInterval(() => {
      setCurrent(c => {
        const next = (c + 1) % markets.length
        setDirection('right')
        setAnimating(true)
        setTimeout(() => { setDisplayed(next); setCurrent(next); setAnimating(false) }, 320)
        return c // don't update current until animation done
      })
    }, 6000)
  }, [markets.length])

  useEffect(() => {
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [resetTimer])

  if (markets.length === 0) return null

  const m = markets[displayed]
  const yesPct = Math.round(m.yes_price * 100)
  const noPct = 100 - yesPct
  const total = m.yes_pool + m.no_pool

  // Animation class: slide out old, slide in new
  const slideOut = direction === 'right' ? '-translate-x-full opacity-0' : 'translate-x-full opacity-0'
  const slideIn  = direction === 'right' ? 'translate-x-full opacity-0' : '-translate-x-full opacity-0'

  return (
    <div className="relative rounded-2xl border border-border bg-card overflow-hidden" style={{ minHeight: 320 }}>
      {/* Slide container */}
      <div
        key={displayed}
        className={`transition-all duration-300 ease-out ${animating ? slideOut : 'translate-x-0 opacity-100'}`}
        style={{ willChange: 'transform, opacity' }}
      >
        <div className="px-6 py-7 space-y-5 flex flex-col" style={{ minHeight: 320 }}>
          {/* Label row */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              🔥 Featured
            </span>
            <span className="text-xs text-muted-foreground truncate">{m.school}</span>
          </div>

          {/* Title */}
          <h2 className="text-lg sm:text-xl font-bold leading-snug line-clamp-4 flex-1">{m.title}</h2>

          {/* Odds bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-green-600 dark:text-sky-400">YES {yesPct}%</span>
              <span className="text-red-500 dark:text-orange-400">NO {noPct}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden flex">
              <div
                className="bg-green-500 dark:bg-sky-500 h-full transition-all duration-700 ease-in-out"
                style={{ width: `${yesPct}%` }}
              />
              <div
                className="bg-red-400 dark:bg-orange-400 h-full transition-all duration-700 ease-in-out"
                style={{ width: `${noPct}%` }}
              />
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
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
            className="self-start inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold hover:bg-primary/90 active:scale-95 transition-all"
          >
            View Market →
          </Link>
        </div>
      </div>

      {/* Arrows */}
      {markets.length > 1 && (
        <>
          <button
            onClick={() => { prev(); resetTimer() }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-background/80 border border-border shadow-sm hover:bg-muted transition-colors z-10"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => { next(); resetTimer() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-background/80 border border-border shadow-sm hover:bg-muted transition-colors z-10"
          >
            <ChevronRight size={14} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {markets.map((_, i) => (
              <button
                key={i}
                onClick={() => { goTo(i, i > current ? 'right' : 'left'); resetTimer() }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? 'bg-primary w-5' : 'bg-muted-foreground/35 w-1.5 hover:bg-muted-foreground/60'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
