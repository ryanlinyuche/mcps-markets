'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Search, Sparkles, Clock, CheckCircle2 } from 'lucide-react'

const BROWSE = [
  { label: 'New',         icon: <Sparkles size={13} />,     href: '/markets/ongoing' },
  { label: 'Ending Soon', icon: <Clock size={13} />,         href: '/markets/closed' },
  { label: 'Resolved',    icon: <CheckCircle2 size={13} />,  href: '/markets/resolved' },
]

const TOPICS = [
  { label: 'Schools',       emoji: '🏫', href: '/schools' },
  { label: 'Sports',        emoji: '🏆', href: '/markets/sports' },
  { label: 'Score Markets', emoji: '📊', href: '/markets/ongoing?type=score' },
  { label: 'SAT / ACT',     emoji: '📝', href: '/markets/ongoing?type=sat_act' },
]

interface SearchResult {
  markets: Array<{ id: number; title: string; yes_price?: number; status: string }>
  users:   Array<{ id: number; name: string; balance: number }>
}

export function InlineSearch() {
  const [focused, setFocused] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult>({ markets: [], users: [] })
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const [dropLeft, setDropLeft] = useState(0)
  const [dropWidth, setDropWidth] = useState(0)

  useEffect(() => { setMounted(true) }, [])

  // Press / to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') inputRef.current?.blur()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Debounced search
  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!query.trim()) { setResults({ markets: [], users: [] }); return }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        if (res.ok) setResults(await res.json())
      } catch { /* ignore */ }
    }, 250)
    return () => clearTimeout(timerRef.current)
  }, [query])

  // Measure container for portal positioning
  useEffect(() => {
    if (focused && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect()
      setDropLeft(r.left)
      setDropWidth(r.width)
    }
  }, [focused])

  const hasQuery = query.trim().length > 0
  const showDropdown = focused && mounted

  const dropdown = showDropdown ? createPortal(
    <div
      style={{
        position: 'fixed',
        top: 57,
        left: dropLeft,
        width: Math.max(dropWidth, 320),
        zIndex: 300,
      }}
      className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
      onMouseDown={e => e.preventDefault()} // prevent input blur on click
    >
      {!hasQuery ? (
        /* Empty state: BROWSE + TOPICS */
        <div className="p-4 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">Browse</p>
            <div className="flex flex-wrap gap-2">
              {BROWSE.map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => { setFocused(false); setQuery('') }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted text-sm transition-colors"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">Topics</p>
            <div className="grid grid-cols-2 gap-2">
              {TOPICS.map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => { setFocused(false); setQuery('') }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-sm font-medium transition-colors"
                >
                  <span className="text-lg leading-none">{item.emoji}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Search results */
        <div className="max-h-[400px] overflow-y-auto">
          {results.markets.length === 0 && results.users.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {results.markets.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 pt-3 pb-2">
                    Markets
                  </p>
                  {results.markets.slice(0, 6).map(m => (
                    <Link
                      key={m.id}
                      href={`/markets/${m.id}`}
                      onClick={() => { setFocused(false); setQuery('') }}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-muted transition-colors gap-2"
                    >
                      <span className="text-sm text-foreground truncate">{m.title}</span>
                      <span className="text-xs font-semibold text-sky-500 dark:text-sky-400 shrink-0 tabular-nums">
                        {Math.round((m.yes_price ?? 0.5) * 100)}%
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              {results.users.length > 0 && (
                <div className="border-t border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 pt-3 pb-2">
                    People
                  </p>
                  {results.users.slice(0, 4).map(u => (
                    <Link
                      key={u.id}
                      href={`/profile/${u.id}`}
                      onClick={() => { setFocused(false); setQuery('') }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{u.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>,
    document.body,
  ) : null

  return (
    <div ref={containerRef} className="flex-1 max-w-xl">
      <div
        className={`flex items-center gap-2 h-9 px-3 rounded-full border transition-all ${
          focused
            ? 'border-primary/60 bg-background shadow-sm'
            : 'border-border bg-muted/40 hover:bg-muted/70'
        }`}
      >
        <Search size={14} className="text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search markets, people..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
        />
        {focused && query ? (
          <button
            onClick={() => setQuery('')}
            className="text-muted-foreground hover:text-foreground text-xs shrink-0"
          >
            ✕
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex shrink-0 text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded border border-border font-mono">
            /
          </kbd>
        )}
      </div>
      {dropdown}
    </div>
  )
}
