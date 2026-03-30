'use client'
import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const MARKET_TYPES = [
  { value: 'yesno', label: 'Yes / No' },
  { value: 'score', label: 'Grade (A/B/C/D/F)' },
  { value: 'sports', label: 'Sports Match' },
  { value: 'sat_act', label: 'SAT / ACT Score' },
  { value: 'teacher_quote', label: 'Teacher Quote' },
]

export default function CreateBubbleMarketPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const bubbleId = Number(id)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [marketType, setMarketType] = useState('yesno')
  const [closesAt, setClosesAt] = useState('')
  const [resolutionCriteria, setResolutionCriteria] = useState('')
  const [teamA, setTeamA] = useState('')
  const [teamB, setTeamB] = useState('')
  const [sport, setSport] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  const isSports = marketType === 'sports'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const body: Record<string, unknown> = {
      title: isSports ? `Will ${teamA} beat ${teamB}?` : title,
      description,
      market_type: marketType,
      closes_at: closesAt,
      resolution_criteria: resolutionCriteria,
    }
    if (isSports) {
      body.sport = sport || 'Other'
      body.team_a = teamA
      body.team_b = teamB
    }
    if (marketType === 'score') {
      body.score_subtype = 'letter_grade'
    }

    try {
      const res = await fetch(`/api/bubbles/${bubbleId}/markets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create market'); return }
      router.push(`/bubbles/${bubbleId}`)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href={`/bubbles/${bubbleId}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Bubble
        </Link>
        <h1 className="text-2xl font-bold mt-2">Create Bubble Market</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Only bubble members can see and bet on this market.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border rounded-xl p-6">
        <div className="space-y-1">
          <label className="text-sm font-medium">Market Type</label>
          <select value={marketType} onChange={e => setMarketType(e.target.value)} className={inputClass}>
            {MARKET_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {isSports ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Team A</label>
                <input className={inputClass} value={teamA} onChange={e => setTeamA(e.target.value)} placeholder="e.g. Churchill" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Team B</label>
                <input className={inputClass} value={teamB} onChange={e => setTeamB(e.target.value)} placeholder="e.g. Whitman" required />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Sport</label>
              <input className={inputClass} value={sport} onChange={e => setSport(e.target.value)} placeholder="e.g. Basketball" />
            </div>
            {teamA && teamB && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
                Title: <strong>Will {teamA} beat {teamB}?</strong>
              </p>
            )}
          </>
        ) : (
          <div className="space-y-1">
            <label className="text-sm font-medium">Title</label>
            <input
              className={inputClass}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Will Jason get an A on the next test?"
              required
              minLength={5}
            />
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea className={inputClass} rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Deadline</label>
          <input className={inputClass} type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} required />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Resolution Criteria <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea className={inputClass} rows={2} value={resolutionCriteria} onChange={e => setResolutionCriteria(e.target.value)} placeholder="How will this be resolved?" />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creating…' : 'Create Market'}
        </button>
      </form>
    </div>
  )
}
