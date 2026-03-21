'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, TrendingUp, User, School } from 'lucide-react'

interface SearchMarket {
  id: number
  title: string
  status: string
  market_type: string
  school: string
  sport: string | null
  period_class: string | null
  score_subtype: string | null
  score_threshold: number | null
  closes_at: string | null
  yes_pool: number
  no_pool: number
  creator_name: string
  subject_name: string | null
}

interface SearchUser {
  id: number
  name: string
  balance: number
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  pending_resolution: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-gray-100 text-gray-600',
  pending_approval: 'bg-yellow-100 text-yellow-700',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  pending_resolution: 'Pending',
  resolved: 'Resolved',
  pending_approval: 'Pending Approval',
}

function marketTypeLabel(m: SearchMarket) {
  if (m.market_type === 'personal_score') return `📊 ${m.subject_name ?? ''}'s Score`
  if (m.market_type === 'score') return '📊 Class Score'
  if (m.market_type === 'sports') return `🏆 ${m.sport ?? 'Sports'}`
  if (m.market_type === 'sat_act') return `📝 ${m.sport ?? 'SAT/ACT'}`
  return ''
}

export function SearchModal() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [markets, setMarkets] = useState<SearchMarket[]>([])
  const [users, setUsers] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setMarkets([])
      setUsers([])
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setMarkets([]); setUsers([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setMarkets(data.markets ?? [])
      setUsers(data.users ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(query), 250)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, search])

  function go(href: string) {
    router.push(href)
    setOpen(false)
  }

  const hasResults = markets.length > 0 || users.length > 0
  const showEmpty = query.length >= 1 && !loading && !hasResults

  return (
    <>
      {/* Search button in navbar */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:flex"
        aria-label="Search"
      >
        <Search size={15} />
        <span className="hidden md:inline text-xs border rounded px-1.5 py-0.5 bg-muted">⌘K</span>
      </button>

      {/* Mobile search icon only */}
      <button
        onClick={() => setOpen(true)}
        className="flex sm:hidden items-center text-muted-foreground hover:text-foreground"
        aria-label="Search"
      >
        <Search size={18} />
      </button>

      {!open ? null : (
        <div
          className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh] px-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Modal */}
          <div className="relative w-full max-w-lg bg-background border rounded-xl shadow-2xl overflow-hidden">
            {/* Input row */}
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Search size={16} className="text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search markets, users, periods, classes..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {loading && (
                <span className="text-xs text-muted-foreground animate-pulse">searching...</span>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {!query && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Search by market name, school, period, class, sport, or player name
                </div>
              )}

              {showEmpty && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </div>
              )}

              {/* Markets */}
              {markets.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <TrendingUp size={11} /> Markets
                    </span>
                  </div>
                  {markets.map(m => {
                    const typeLabel = marketTypeLabel(m)
                    const total = m.yes_pool + m.no_pool
                    return (
                      <button
                        key={m.id}
                        onClick={() => go(`/markets/${m.id}`)}
                        className="w-full px-4 py-2.5 hover:bg-muted text-left flex items-start gap-3 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[m.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABELS[m.status] ?? m.status}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <School size={10} /> {m.school}
                            </span>
                            {typeLabel && (
                              <span className="text-xs text-muted-foreground">{typeLabel}</span>
                            )}
                            {m.period_class && (
                              <span className="text-xs text-muted-foreground">Period {m.period_class}</span>
                            )}
                            {(m.score_subtype === 'overunder' && m.score_threshold) && (
                              <span className="text-xs text-muted-foreground">O/U {m.score_threshold}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            by {m.creator_name} · {total.toLocaleString()} coins
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Users */}
              {users.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <User size={11} /> Players
                    </span>
                  </div>
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => go(`/leaderboard`)}
                      className="w-full px-4 py-2.5 hover:bg-muted text-left flex items-center gap-3 transition-colors"
                    >
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User size={13} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.balance.toLocaleString()} coins</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Bottom padding */}
              {hasResults && <div className="h-2" />}
            </div>

            {/* Footer hint */}
            <div className="border-t px-4 py-2 flex gap-4 text-xs text-muted-foreground">
              <span>↵ to select</span>
              <span>Esc to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
