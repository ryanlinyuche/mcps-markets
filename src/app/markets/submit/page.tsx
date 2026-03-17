'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { ClassPeriod } from '@/types'

const SCHOOLS = [
  'Winston Churchill High School',
  'Other MCPS School',
  'Sports',
]

const SPORTS_LIST = [
  'Basketball', 'Soccer', 'Football', 'Baseball', 'Softball',
  'Lacrosse', 'Tennis', 'Swimming', 'Track & Field', 'Volleyball',
  'Wrestling', 'Cross Country', 'Other',
]

type MarketType = 'yesno' | 'score' | 'personal_score' | 'sports'

export default function SubmitMarketPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [school, setSchool] = useState(SCHOOLS[0])
  const [marketType, setMarketType] = useState<MarketType>('yesno')
  const [resolutionCriteria, setResolutionCriteria] = useState('')
  const [resolutionSource, setResolutionSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)

  // Schedule for period picker
  const [schedule, setSchedule] = useState<ClassPeriod[]>([])
  const [periodClass, setPeriodClass] = useState('')

  // Sports fields
  const [sport, setSport] = useState('')
  const [teamA, setTeamA] = useState('')
  const [teamB, setTeamB] = useState('')
  const [sportsSubtype, setSportsSubtype] = useState<'matchup' | 'overunder' | 'other'>('matchup')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.name) setUserName(d.name)
    }).catch(() => {})
    fetch('/api/auth/schedule').then(r => r.json()).then((d: ClassPeriod[]) => {
      if (Array.isArray(d)) setSchedule(d)
    }).catch(() => {})
  }, [])

  // Auto-switch school to Sports when sports type selected
  useEffect(() => {
    if (marketType === 'sports') setSchool('Sports')
    else if (school === 'Sports') setSchool(SCHOOLS[0])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketType])

  const isScoreType = marketType === 'score' || marketType === 'personal_score'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim().length < 5) { toast.error('Title must be at least 5 characters'); return }
    if (!resolutionCriteria.trim()) { toast.error('Resolution criteria is required'); return }
    if (!resolutionSource.trim()) { toast.error('Resolution source is required'); return }
    if (marketType === 'sports' && !sport) { toast.error('Select a sport'); return }

    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        closes_at: closesAt || null,
        school,
        market_type: marketType,
        resolution_criteria: resolutionCriteria.trim(),
        resolution_source: resolutionSource.trim(),
        period_class: isScoreType && periodClass ? periodClass : null,
        sport: marketType === 'sports' ? sport : null,
        team_a: marketType === 'sports' && sportsSubtype === 'matchup' ? teamA.trim() || null : null,
        team_b: marketType === 'sports' && sportsSubtype === 'matchup' ? teamB.trim() || null : null,
      }

      const res = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to submit market'); return }
      toast.success('Market submitted! An admin will review it shortly.')
      router.push('/markets')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Submit a Market</CardTitle>
          <CardDescription>
            Propose a question for students to bet on. An admin will review it before it goes live.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Market Type */}
            <div className="space-y-1">
              <Label>Market Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { type: 'yesno', label: 'Yes / No', desc: 'A yes or no question', color: 'primary' },
                  { type: 'score', label: 'Class Score', desc: 'Bet on class average grade', color: 'primary' },
                  { type: 'personal_score', label: 'My Score', desc: 'Let others bet on YOUR grade', color: 'purple' },
                  { type: 'sports', label: '🏆 Sports', desc: 'Who wins, over/under, etc.', color: 'orange' },
                ] as { type: MarketType; label: string; desc: string; color: string }[]).map(({ type, label, desc, color }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMarketType(type)}
                    className={`rounded-md border px-3 py-3 text-sm font-medium text-left transition-colors ${
                      marketType === type
                        ? color === 'purple'
                          ? 'border-purple-600 bg-purple-50 text-purple-700'
                          : color === 'orange'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-primary bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-semibold">{label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
              {marketType === 'personal_score' && (
                <p className="text-xs text-purple-700 bg-purple-50 rounded px-2 py-1.5">
                  📊 This market will be about <strong>{userName ?? 'your'}</strong> personal score. Only you can create markets about yourself.
                </p>
              )}
              {marketType === 'sports' && (
                <p className="text-xs text-orange-700 bg-orange-50 rounded px-2 py-1.5">
                  🏆 Create a sports betting market — who wins a game, over/under points, etc.
                </p>
              )}
            </div>

            {/* Sports sub-fields */}
            {marketType === 'sports' && (
              <div className="space-y-3 rounded-md border border-orange-200 bg-orange-50/30 p-3">
                <div className="space-y-1">
                  <Label>Sport</Label>
                  <select
                    value={sport}
                    onChange={e => setSport(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    <option value="">Select a sport...</option>
                    {SPORTS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>Market Style</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { val: 'matchup', label: 'Matchup', desc: 'Who wins?' },
                      { val: 'overunder', label: 'Over/Under', desc: 'Total points' },
                      { val: 'other', label: 'Other', desc: 'Custom' },
                    ] as { val: 'matchup' | 'overunder' | 'other'; label: string; desc: string }[]).map(o => (
                      <button
                        key={o.val}
                        type="button"
                        onClick={() => setSportsSubtype(o.val)}
                        className={`rounded-md border px-2 py-2 text-xs font-medium text-left transition-colors ${
                          sportsSubtype === o.val ? 'border-orange-500 bg-orange-100 text-orange-800' : 'hover:bg-muted bg-background'
                        }`}
                      >
                        <div className="font-semibold">{o.label}</div>
                        <div className="text-muted-foreground">{o.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {sportsSubtype === 'matchup' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Team A (YES)</Label>
                      <Input
                        value={teamA}
                        onChange={e => setTeamA(e.target.value)}
                        placeholder="e.g. Churchill"
                        maxLength={50}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Team B (NO)</Label>
                      <Input
                        value={teamB}
                        onChange={e => setTeamB(e.target.value)}
                        placeholder="e.g. BCC"
                        maxLength={50}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* School */}
            {marketType !== 'sports' && (
              <div className="space-y-1">
                <Label htmlFor="school">School</Label>
                <select
                  id="school"
                  value={school}
                  onChange={e => setSchool(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {SCHOOLS.filter(s => s !== 'Sports').map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Period picker for score markets */}
            {isScoreType && (
              <div className="space-y-1">
                <Label htmlFor="period">Class Period (optional)</Label>
                {schedule.length > 0 ? (
                  <select
                    id="period"
                    value={periodClass}
                    onChange={e => setPeriodClass(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">— Not tied to a specific period —</option>
                    {schedule.map(cls => (
                      <option key={cls.period} value={cls.period}>
                        Period {cls.period} — {cls.course_title}
                        {cls.teacher ? ` (${cls.teacher})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-muted-foreground border rounded px-3 py-2">
                    Schedule not loaded. Log out and back in to sync your classes from StudentVUE.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Link this market to one of your classes. You must be enrolled to create a market for a period.</p>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1">
              <Label htmlFor="title">
                {marketType === 'personal_score' ? 'Test / Quiz Name *'
                  : marketType === 'score' ? 'Class & Test Name *'
                  : marketType === 'sports' ? 'Event Title *'
                  : 'Question *'}
              </Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={
                  marketType === 'personal_score' ? 'e.g. AP Calc BC — Unit 5 Test'
                    : marketType === 'score' ? 'e.g. AP Calc BC — Unit 5 Test'
                    : marketType === 'sports' ? 'e.g. Churchill vs BCC — Varsity Basketball'
                    : 'e.g. Will MCPS cancel school on Dec 20?'
                }
                required
                maxLength={200}
              />
              {marketType === 'sports' && sportsSubtype === 'matchup' && teamA && teamB && (
                <p className="text-xs text-muted-foreground">YES = {teamA} wins · NO = {teamB} wins</p>
              )}
              {marketType === 'score' && <p className="text-xs text-muted-foreground">Students bet on which grade range (A/B/C/D/F) the class average falls in</p>}
              {marketType === 'personal_score' && <p className="text-xs text-muted-foreground">Others bet on which grade range (A/B/C/D/F) <strong>{userName ?? 'you'}</strong> score in</p>}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={
                  marketType === 'sports' ? 'Add context: date, time, location, league...'
                    : marketType === 'personal_score' ? 'Add context: which class, teacher, when scores come out...'
                    : marketType === 'score' ? 'Add context: which class, teacher, when scores are released...'
                    : 'Add any additional context...'
                }
                className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={500}
              />
            </div>

            {/* Resolution Criteria */}
            <div className="space-y-1">
              <Label htmlFor="resolutionCriteria">Resolution Criteria *</Label>
              <textarea
                id="resolutionCriteria"
                value={resolutionCriteria}
                onChange={e => setResolutionCriteria(e.target.value)}
                placeholder={
                  marketType === 'sports' ? 'e.g. Resolved based on the final score posted on MaxPreps.'
                    : marketType === 'personal_score' ? `e.g. Resolved based on ${userName ?? 'my'} grade visible on Canvas once posted.`
                    : marketType === 'score' ? 'e.g. Resolved based on class average visible on Canvas once posted.'
                    : 'e.g. Resolved YES if MCPS officially announces a cancellation.'
                }
                className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={500}
                required
              />
              <p className="text-xs text-muted-foreground">Explain exactly how and when this market will be resolved.</p>
            </div>

            {/* Resolution Source */}
            <div className="space-y-1">
              <Label htmlFor="resolutionSource">Resolution Source *</Label>
              <Input
                id="resolutionSource"
                value={resolutionSource}
                onChange={e => setResolutionSource(e.target.value)}
                placeholder={
                  marketType === 'sports' ? 'e.g. MaxPreps, ESPN, MCPS Athletics website'
                    : 'e.g. Canvas gradebook, Google Classroom, MCPS website'
                }
                required
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">Where can anyone verify the outcome?</p>
            </div>

            {/* Closes At */}
            <div className="space-y-1">
              <Label htmlFor="closesAt">Betting closes at (optional)</Label>
              <Input
                id="closesAt"
                type="datetime-local"
                value={closesAt}
                onChange={e => setClosesAt(e.target.value)}
              />
              {marketType === 'sports' && (
                <p className="text-xs text-muted-foreground">Typically set to game start time so no one bets after the game begins.</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Submitting...</> : 'Submit for Review'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
