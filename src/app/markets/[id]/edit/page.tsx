'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react'
import Link from 'next/link'

const SCHOOLS = [
  'Winston Churchill High School',
  'Other MCPS School',
  'Sports',
]

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
  creator_id: number
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

  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

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

        // Pre-fill form
        setTitle(m.title)
        setDescription(m.description ?? '')
        setResolutionCriteria(m.resolution_criteria ?? '')
        setResolutionSource(m.resolution_source ?? '')
        setSchool(m.school)
        // Convert DB datetime to datetime-local format
        if (m.closes_at) {
          try {
            const d = new Date(m.closes_at)
            // Format as YYYY-MM-DDTHH:mm for datetime-local
            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              .toISOString().slice(0, 16)
            setClosesAt(local)
          } catch { setClosesAt('') }
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

    setLoading(true)
    try {
      const res = await fetch(`/api/markets/${marketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          closes_at: closesAt ? new Date(closesAt).toISOString().replace('T', ' ').slice(0, 19) : null,
          resolution_criteria: resolutionCriteria.trim() || null,
          resolution_source: resolutionSource.trim() || null,
          school: isAdmin ? school : undefined,
        }),
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
