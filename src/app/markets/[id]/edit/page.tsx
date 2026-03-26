'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, ShieldCheck, RefreshCw, Plus, X, Lock } from 'lucide-react'
import Link from 'next/link'

const SCHOOLS = [
  'Winston Churchill High School',
  'Other MCPS School',
  'Sports',
]

interface OptionEntry {
  label: string
  amount: number   // bets placed on this option
  isNew?: boolean  // newly added, not yet in DB
}

interface MarketData {
  id: number
  title: string
  description: string | null
  closes_at: string | null
  resolution_criteria: string | null
  resolution_source: string | null
  school: string
  status: string
  market_type: string
  score_subtype: string | null
  creator_id: number
  option_pools?: { label: string; amount: number; sort_order: number }[]
}

interface SessionData {
  sub: string
  isAdmin: boolean
}

export default function EditMarketPage() {
  const router = useRouter()
  const params = useParams()
  const marketId = params.id as string

  const [market, setMarket] = useState<MarketData | null>(null)
  const [session, setSession] = useState<SessionData | null>(null)
  const [loadError, setLoadError] = useState('')

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [resolutionCriteria, setResolutionCriteria] = useState('')
  const [resolutionSource, setResolutionSource] = useState('')
  const [school, setSchool] = useState('')

  // Option pools (for score markets)
  const [options, setOptions] = useState<OptionEntry[]>([])

  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  const hasOptionPools = (m: MarketData) =>
    (m.market_type === 'score' || m.market_type === 'personal_score') &&
    m.score_subtype !== 'overunder'

  useEffect(() => {
    async function load() {
      try {
        const [mRes, sRes] = await Promise.all([
          fetch(`/api/markets/${marketId}`),
          fetch('/api/auth/me'),
        ])
        if (!mRes.ok) { setLoadError('Market not found'); setPageLoading(false); return }
        const m: MarketData = await mRes.json()
        const s: SessionData = await sRes.json()
        setMarket(m)
        setSession(s)

        setTitle(m.title)
        setDescription(m.description ?? '')
        setResolutionCriteria(m.resolution_criteria ?? '')
        setResolutionSource(m.resolution_source ?? '')
        setSchool(m.school)
        if (m.closes_at) {
          try {
            const d = new Date(m.closes_at)
            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              .toISOString().slice(0, 16)
            setClosesAt(local)
          } catch { setClosesAt('') }
        }

        // Pre-fill options
        if (hasOptionPools(m) && m.option_pools) {
          setOptions(
            [...m.option_pools]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(op => ({ label: op.label, amount: op.amount }))
          )
        }
      } catch {
        setLoadError('Failed to load market')
      } finally {
        setPageLoading(false)
      }
    }
    load()
  }, [marketId])

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loadError || !market || !session) {
    return (
      <div className="max-w-xl mx-auto py-10 text-center text-muted-foreground">
        {loadError || 'Something went wrong'}
      </div>
    )
  }

  const isAdmin = session.isAdmin
  const isCreator = Number(session.sub) === market.creator_id

  if (!isAdmin && !isCreator) {
    return (
      <div className="max-w-xl mx-auto py-10 text-center text-muted-foreground">
        You don&apos;t have permission to edit this market.
      </div>
    )
  }

  if (market.status === 'resolved') {
    return (
      <div className="max-w-xl mx-auto py-10 text-center text-muted-foreground">
        Resolved markets cannot be edited.
      </div>
    )
  }

  // ── Option pool helpers ────────────────────────────────────────────────────
  const updateOptionLabel = (idx: number, val: string) => {
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, label: val } : o))
  }

  const removeOption = (idx: number) => {
    setOptions(prev => prev.filter((_, i) => i !== idx))
  }

  const addOption = () => {
    setOptions(prev => [...prev, { label: '', amount: 0, isNew: true }])
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || title.trim().length < 5) {
      toast.error('Title must be at least 5 characters')
      return
    }
    if (!closesAt) {
      toast.error('A deadline is required')
      return
    }

    // Validate options if applicable
    if (hasOptionPools(market!)) {
      const labels = options.map(o => o.label.trim()).filter(Boolean)
      if (labels.length < 2) {
        toast.error('Score markets need at least 2 options')
        return
      }
      const unique = new Set(labels)
      if (unique.size !== labels.length) {
        toast.error('Option labels must be unique')
        return
      }
    }

    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        closes_at: closesAt ? new Date(closesAt).toISOString().replace('T', ' ').slice(0, 19) : null,
        resolution_criteria: resolutionCriteria.trim() || null,
        resolution_source: resolutionSource.trim() || null,
        school: isAdmin ? school : undefined,
      }

      if (hasOptionPools(market!)) {
        body.options = options.map(o => o.label.trim()).filter(Boolean)
      }

      const res = await fetch(`/api/markets/${marketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to update market')
        return
      }
      if (isAdmin) {
        toast.success('Market updated')
      } else {
        toast.success('Market updated — resubmitted for admin review')
      }
      router.push(`/markets/${marketId}`)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const showOptions = hasOptionPools(market)

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href={`/markets/${marketId}`}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft size={14} /> Back to market
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Edit Market</CardTitle>
          <CardDescription>
            {isAdmin
              ? 'As an admin, your changes take effect immediately without re-review.'
              : 'Editing will resubmit this market for admin review before it goes live again.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Notice banner */}
          {!isAdmin && (
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3.5 py-3 mb-5 text-sm text-amber-800 dark:text-amber-300">
              <RefreshCw size={15} className="shrink-0 mt-0.5" />
              <span>Your market will go back to <strong>Pending Review</strong> after saving. An admin must re-approve it.</span>
            </div>
          )}
          {isAdmin && (
            <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-3.5 py-3 mb-5 text-sm text-blue-800 dark:text-blue-300">
              <ShieldCheck size={15} className="shrink-0 mt-0.5" />
              <span>Admin edit — changes are applied immediately. Market status is preserved.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-1">
              <Label htmlFor="title">Question / Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={500}
              />
            </div>

            {/* School — admin only */}
            {isAdmin && (
              <div className="space-y-1">
                <Label htmlFor="school">School</Label>
                <select
                  id="school"
                  value={school}
                  onChange={e => setSchool(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Closes At */}
            <div className="space-y-1">
              <Label htmlFor="closesAt">Deadline *</Label>
              <Input
                id="closesAt"
                type="datetime-local"
                value={closesAt}
                onChange={e => setClosesAt(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">When betting closes on this market.</p>
            </div>

            {/* ── Option pools (score markets only) ── */}
            {showOptions && (
              <div className="space-y-2">
                <Label>Betting Options</Label>
                <p className="text-xs text-muted-foreground">
                  Options with bets (<Lock size={10} className="inline" />) cannot be removed or renamed.
                </p>
                <div className="space-y-2">
                  {options.map((opt, i) => {
                    const locked = opt.amount > 0
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            value={opt.label}
                            onChange={e => updateOptionLabel(i, e.target.value)}
                            placeholder="Option label"
                            disabled={locked}
                            className={locked ? 'pr-24 opacity-70' : ''}
                            maxLength={80}
                          />
                          {locked && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
                              <Lock size={10} /> {opt.amount} bet{opt.amount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          disabled={locked}
                          className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors shrink-0 ${
                            locked
                              ? 'text-muted-foreground/30 cursor-not-allowed'
                              : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                          }`}
                          aria-label="Remove option"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus size={14} /> Add option
                </button>
              </div>
            )}

            {/* Resolution Criteria */}
            <div className="space-y-1">
              <Label htmlFor="resolutionCriteria">Resolution Criteria</Label>
              <textarea
                id="resolutionCriteria"
                value={resolutionCriteria}
                onChange={e => setResolutionCriteria(e.target.value)}
                className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={500}
              />
            </div>

            {/* Resolution Source */}
            <div className="space-y-1">
              <Label htmlFor="resolutionSource">Resolution Source</Label>
              <Input
                id="resolutionSource"
                value={resolutionSource}
                onChange={e => setResolutionSource(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/markets/${marketId}`)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading
                  ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving...</>
                  : isAdmin ? 'Save Changes' : 'Save & Resubmit'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
