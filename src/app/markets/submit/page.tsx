'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, X } from 'lucide-react'
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

type MarketType = 'yesno' | 'score' | 'personal_score' | 'sports' | 'sat_act' | 'teacher_quote'
type ScoreSubtype = 'letter_grade' | 'overunder'
type SatActType = 'SAT' | 'ACT'

function TeacherQuoteDisclaimer({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [checked1, setChecked1] = useState(false)
  const [checked2, setChecked2] = useState(false)
  const [checked3, setChecked3] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  const allChecked = checked1 && checked2 && checked3

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-border bg-amber-50 dark:bg-amber-500/10 rounded-t-xl">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="font-bold text-base text-amber-900 dark:text-amber-300">Teacher Quote Market — Rules</h2>
            <p className="text-xs text-amber-700 dark:text-amber-400/80">Read carefully before proceeding</p>
          </div>
          <button
            onClick={onDecline}
            className="ml-auto p-1.5 rounded-md hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Teacher Quote markets let you bet on whether a specific teacher will say a particular phrase in class.
            These markets have <strong>strict rules</strong> you must follow:
          </p>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={checked1}
                onChange={e => setChecked1(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-amber-500 shrink-0"
              />
              <span className="text-sm">
                <strong>Video proof is required.</strong> You must have a clear video recording of the teacher saying the phrase before you can request resolution. Screenshots and secondhand accounts are not accepted.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={checked2}
                onChange={e => setChecked2(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-amber-500 shrink-0"
              />
              <span className="text-sm">
                <strong>Do not prompt or manipulate the teacher.</strong> You may not directly ask, suggest, hint, or otherwise influence the teacher to say the phrase. The market must resolve naturally. Attempting to manipulate the outcome is market fraud.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={checked3}
                onChange={e => setChecked3(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border accent-amber-500 shrink-0"
              />
              <span className="text-sm">
                <strong>Violations result in account suspension.</strong> Submitting false proof or attempting to manipulate outcomes will result in your market being voided and your account being banned from creating future markets.
              </span>
            </label>
          </div>

          <div className="rounded-lg bg-muted/60 border border-border px-3 py-2 text-xs text-muted-foreground">
            ℹ️ Markets that cannot be resolved (e.g. teacher never says the phrase before the close date) will resolve <strong>NO</strong>. All bets are refunded if the market is cancelled.
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 pt-0">
          <Button variant="outline" className="flex-1" onClick={onDecline}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            disabled={!allChecked}
            onClick={onAccept}
          >
            I Understand — Continue
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

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

  // Score subtype fields
  const [scoreSubtype, setScoreSubtype] = useState<ScoreSubtype>('letter_grade')
  const [scoreThreshold, setScoreThreshold] = useState('')

  // SAT/ACT fields
  const [satActType, setSatActType] = useState<SatActType>('SAT')

  // Teacher Quote fields
  const [teacherQuote, setTeacherQuote] = useState('')
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [teacherQuoteSubtype, setTeacherQuoteSubtype] = useState<'yesno' | 'overunder'>('yesno')
  const [teacherQuoteThreshold, setTeacherQuoteThreshold] = useState('')

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

  // Format a datetime-local string into "Dec 20, 2:30 PM"
  function formatCloseDate(dt: string) {
    if (!dt) return null
    try {
      return new Date(dt).toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    } catch { return null }
  }

  // Auto-generate title and pre-fill resolution fields for Teacher Quote
  useEffect(() => {
    if (marketType !== 'teacher_quote') return
    const selectedPeriod = schedule.find(c => c.period === periodClass)
    const teacher = selectedPeriod?.teacher || (periodClass ? `Period ${periodClass} teacher` : 'the teacher')
    const quote = teacherQuote.trim()
    const threshold = teacherQuoteThreshold ? `${Number(teacherQuoteThreshold)}.5` : '?.5'
    const dateLabel = formatCloseDate(closesAt)

    if (quote) {
      if (teacherQuoteSubtype === 'overunder') {
        const datePart = dateLabel ? ` before ${dateLabel}` : ''
        setTitle(`Will ${teacher} say "${quote}" more than ${threshold} times in class${datePart}?`)
      } else {
        setTitle(`Will ${teacher} say "${quote}" in class?`)
      }
    } else {
      setTitle('')
    }
    if (teacherQuoteSubtype === 'overunder') {
      setResolutionCriteria(`Resolved YES if the market creator provides video evidence of the teacher saying this phrase more than ${threshold} times during class. Resolved NO otherwise.`)
    } else {
      setResolutionCriteria('Resolved YES if the market creator provides clear video evidence of the teacher saying this phrase during class. Resolved NO if the market closes without video proof.')
    }
    setResolutionSource('Video recording submitted by market creator')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketType, teacherQuote, periodClass, schedule, teacherQuoteSubtype, teacherQuoteThreshold, closesAt])

  const isScoreType = marketType === 'score' || marketType === 'personal_score'
  const isTeacherQuote = marketType === 'teacher_quote'

  function handleTypeSelect(type: MarketType) {
    if (type === 'teacher_quote' && !disclaimerAccepted) {
      setShowDisclaimer(true)
      return
    }
    setMarketType(type)
  }

  function handleDisclaimerAccept() {
    setDisclaimerAccepted(true)
    setShowDisclaimer(false)
    setMarketType('teacher_quote')
  }

  function handleDisclaimerDecline() {
    setShowDisclaimer(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (title.trim().length < 5) { toast.error('Title must be at least 5 characters'); return }
    if (!resolutionCriteria.trim()) { toast.error('Resolution criteria is required'); return }
    if (!resolutionSource.trim()) { toast.error('Resolution source is required'); return }
    if (marketType === 'sports' && !sport) { toast.error('Select a sport'); return }
    if ((isScoreType && scoreSubtype === 'overunder') && !scoreThreshold) {
      toast.error('Enter a score threshold for over/under'); return
    }
    if (marketType === 'sat_act' && !scoreThreshold) {
      toast.error('Enter a score threshold for over/under'); return
    }
    if (isTeacherQuote && !periodClass) {
      toast.error('Select a class period for this market'); return
    }
    if (isTeacherQuote && !teacherQuote.trim()) {
      toast.error('Enter the phrase you expect the teacher to say'); return
    }
    if (isTeacherQuote && teacherQuoteSubtype === 'overunder' && !teacherQuoteThreshold) {
      toast.error('Enter a count threshold for the over/under bet'); return
    }
    if (isTeacherQuote && teacherQuoteSubtype === 'overunder' && !closesAt) {
      toast.error('A close date/time is required for over/under Teacher Quote markets'); return
    }

    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        closes_at: closesAt ? new Date(closesAt).toISOString().replace('T', ' ').slice(0, 19) : null,
        school,
        market_type: marketType,
        resolution_criteria: resolutionCriteria.trim(),
        resolution_source: resolutionSource.trim(),
        period_class: (isScoreType || isTeacherQuote) && periodClass ? periodClass : null,
        sport: marketType === 'sports' ? sport : marketType === 'sat_act' ? satActType : null,
        team_a: marketType === 'sports' && sportsSubtype === 'matchup' ? teamA.trim() || null : null,
        team_b: marketType === 'sports' && sportsSubtype === 'matchup' ? teamB.trim() || null : null,
        score_subtype: isScoreType ? scoreSubtype
          : marketType === 'sat_act' ? 'overunder'
          : isTeacherQuote ? teacherQuoteSubtype
          : null,
        score_threshold: (isScoreType && scoreSubtype === 'overunder') || marketType === 'sat_act'
          ? Number(scoreThreshold)
          : (isTeacherQuote && teacherQuoteSubtype === 'overunder')
          ? Number(teacherQuoteThreshold) + 0.5
          : null,
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
    <>
      {showDisclaimer && (
        <TeacherQuoteDisclaimer
          onAccept={handleDisclaimerAccept}
          onDecline={handleDisclaimerDecline}
        />
      )}

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
                    { type: 'yesno',         label: 'Yes / No',       desc: 'A yes or no question',            color: 'primary' },
                    { type: 'score',         label: 'Class Score',    desc: 'Bet on class average grade',      color: 'primary' },
                    { type: 'personal_score',label: 'My Score',       desc: 'Let others bet on YOUR grade',    color: 'purple' },
                    { type: 'sports',        label: '🏆 Sports',      desc: 'Who wins, over/under, etc.',      color: 'orange' },
                    { type: 'sat_act',       label: '📝 SAT / ACT',   desc: 'Standardized test score bet',     color: 'blue' },
                    { type: 'teacher_quote', label: '💬 Teacher Quote',desc: 'Bet on what a teacher will say', color: 'amber' },
                  ] as { type: MarketType; label: string; desc: string; color: string }[]).map(({ type, label, desc, color }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeSelect(type)}
                      className={`rounded-md border px-3 py-3 text-sm font-medium text-left transition-colors ${
                        marketType === type
                          ? color === 'purple'
                            ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500 dark:text-purple-400'
                            : color === 'orange'
                            ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:border-orange-500 dark:text-orange-400'
                            : color === 'blue'
                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500 dark:text-blue-400'
                            : color === 'amber'
                            ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500 dark:text-amber-400'
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
                  <p className="text-xs text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 rounded px-2 py-1.5">
                    📊 This market will be about <strong>{userName ?? 'your'}</strong> personal score. Only you can create markets about yourself.
                  </p>
                )}
                {marketType === 'sports' && (
                  <p className="text-xs text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 rounded px-2 py-1.5">
                    🏆 Create a sports betting market — who wins a game, over/under points, etc.
                  </p>
                )}
                {marketType === 'sat_act' && (
                  <p className="text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 rounded px-2 py-1.5">
                    📝 Bet on whether your SAT or ACT score will be OVER or UNDER a target number.
                  </p>
                )}
                {isTeacherQuote && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded px-2 py-1.5">
                    💬 Bet on whether a teacher will say a specific phrase in class. <strong>Video proof required</strong> to resolve YES.
                  </p>
                )}
              </div>

              {/* Teacher Quote fields */}
              {isTeacherQuote && (
                <div className="space-y-3 rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/5 p-3">
                  <div className="space-y-1">
                    <Label htmlFor="period-tq">Class Period <span className="text-destructive">*</span></Label>
                    {schedule.length > 0 ? (
                      <select
                        id="period-tq"
                        value={periodClass}
                        onChange={e => setPeriodClass(e.target.value)}
                        className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                      >
                        <option value="">— Select the class period —</option>
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
                  </div>

                  <div className="space-y-1">
                    <Label>Bet Style</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTeacherQuoteSubtype('yesno')}
                        className={`rounded-md border px-3 py-2.5 text-sm font-medium text-left transition-colors ${
                          teacherQuoteSubtype === 'yesno'
                            ? 'border-amber-500 bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                            : 'hover:bg-muted bg-background'
                        }`}
                      >
                        <div className="font-semibold">Yes / No</div>
                        <div className="text-xs text-muted-foreground mt-0.5">Will they say it at all?</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeacherQuoteSubtype('overunder')}
                        className={`rounded-md border px-3 py-2.5 text-sm font-medium text-left transition-colors ${
                          teacherQuoteSubtype === 'overunder'
                            ? 'border-amber-500 bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300'
                            : 'hover:bg-muted bg-background'
                        }`}
                      >
                        <div className="font-semibold">Over / Under</div>
                        <div className="text-xs text-muted-foreground mt-0.5">How many times?</div>
                      </button>
                    </div>
                  </div>

                  {teacherQuoteSubtype === 'overunder' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Count (whole number)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={99}
                          value={teacherQuoteThreshold}
                          onChange={e => setTeacherQuoteThreshold(e.target.value)}
                          placeholder="e.g. 3"
                          className="w-28"
                          required
                        />
                        <span className="text-sm text-muted-foreground">
                          → threshold stored as <strong>{teacherQuoteThreshold ? `${teacherQuoteThreshold}.5` : '?.5'}</strong>
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        YES = says it <strong>more than {teacherQuoteThreshold ? `${teacherQuoteThreshold}.5` : '?.5'}</strong> times ({Number(teacherQuoteThreshold || 0) + 1}+) · NO = {Number(teacherQuoteThreshold || 0)} or fewer
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="teacher-quote-input">
                      Phrase / Quote <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="teacher-quote-input"
                      value={teacherQuote}
                      onChange={e => setTeacherQuote(e.target.value)}
                      placeholder='e.g. "Back in my day..."'
                      maxLength={150}
                      required
                    />
                    <p className="text-xs text-muted-foreground">The exact phrase you think the teacher will say.</p>
                  </div>

                  {title && (
                    <div className="rounded-md bg-background border border-border px-3 py-2">
                      <p className="text-xs text-muted-foreground mb-0.5">Generated title:</p>
                      <p className="text-sm font-medium">{title}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Score subtype selector (letter grade vs over/under) */}
              {isScoreType && (
                <div className="space-y-2 rounded-md border border-muted p-3">
                  <Label className="text-sm font-medium">Bet Style</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setScoreSubtype('letter_grade')}
                      className={`rounded-md border px-3 py-2.5 text-sm font-medium text-left transition-colors ${
                        scoreSubtype === 'letter_grade' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="font-semibold">Letter Grade</div>
                      <div className="text-xs text-muted-foreground mt-0.5">A / B / C / D / F</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScoreSubtype('overunder')}
                      className={`rounded-md border px-3 py-2.5 text-sm font-medium text-left transition-colors ${
                        scoreSubtype === 'overunder' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="font-semibold">Over / Under</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Above or below a score</div>
                    </button>
                  </div>
                  {scoreSubtype === 'overunder' && (
                    <div className="space-y-1 pt-1">
                      <Label className="text-xs">Score Threshold (0–100)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={scoreThreshold}
                        onChange={e => setScoreThreshold(e.target.value)}
                        placeholder="e.g. 85"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Bettors pick: <strong>Over {scoreThreshold || '?'}</strong> (YES) or <strong>Under {scoreThreshold || '?'}</strong> (NO)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SAT/ACT sub-fields */}
              {marketType === 'sat_act' && (
                <div className="space-y-3 rounded-md border border-blue-200 dark:border-blue-500/30 bg-blue-50/30 dark:bg-blue-500/5 p-3">
                  <div className="space-y-1">
                    <Label>Test Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['SAT', 'ACT'] as SatActType[]).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSatActType(t)}
                          className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                            satActType === t ? 'border-blue-500 bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300' : 'hover:bg-muted bg-background'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Score Threshold ({satActType === 'SAT' ? '400–1600' : '1–36'})
                    </Label>
                    <Input
                      type="number"
                      min={satActType === 'SAT' ? 400 : 1}
                      max={satActType === 'SAT' ? 1600 : 36}
                      value={scoreThreshold}
                      onChange={e => setScoreThreshold(e.target.value)}
                      placeholder={satActType === 'SAT' ? 'e.g. 1200' : 'e.g. 28'}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Bettors pick: <strong>Over {scoreThreshold || '?'}</strong> (YES) or <strong>Under {scoreThreshold || '?'}</strong> (NO)
                    </p>
                  </div>
                </div>
              )}

              {/* Sports sub-fields */}
              {marketType === 'sports' && (
                <div className="space-y-3 rounded-md border border-orange-200 dark:border-orange-500/30 bg-orange-50/30 dark:bg-orange-500/5 p-3">
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
                            sportsSubtype === o.val ? 'border-orange-500 bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300' : 'hover:bg-muted bg-background'
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
              {marketType !== 'sports' && marketType !== 'sat_act' && marketType !== 'teacher_quote' && (
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

              {/* Title — hidden/readonly for teacher_quote (auto-generated) */}
              {!isTeacherQuote && (
                <div className="space-y-1">
                  <Label htmlFor="title">
                    {marketType === 'personal_score' ? 'Test / Quiz Name *'
                      : marketType === 'score' ? 'Class & Test Name *'
                      : marketType === 'sports' ? 'Event Title *'
                      : marketType === 'sat_act' ? 'Title *'
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
                        : marketType === 'sat_act' ? `e.g. My ${satActType} Score — March 2026`
                        : 'e.g. Will MCPS cancel school on Dec 20?'
                    }
                    required
                    maxLength={200}
                  />
                  {marketType === 'sports' && sportsSubtype === 'matchup' && teamA && teamB && (
                    <p className="text-xs text-muted-foreground">YES = {teamA} wins · NO = {teamB} wins</p>
                  )}
                  {marketType === 'score' && scoreSubtype === 'letter_grade' && (
                    <p className="text-xs text-muted-foreground">Students bet on which grade range (A/B/C/D/F) the class average falls in</p>
                  )}
                  {marketType === 'score' && scoreSubtype === 'overunder' && (
                    <p className="text-xs text-muted-foreground">Students bet over/under {scoreThreshold || '?'} on the class average</p>
                  )}
                  {marketType === 'personal_score' && scoreSubtype === 'letter_grade' && (
                    <p className="text-xs text-muted-foreground">Others bet on which grade range (A/B/C/D/F) <strong>{userName ?? 'you'}</strong> score in</p>
                  )}
                  {marketType === 'personal_score' && scoreSubtype === 'overunder' && (
                    <p className="text-xs text-muted-foreground">Others bet over/under {scoreThreshold || '?'} on <strong>{userName ?? 'your'}</strong> score</p>
                  )}
                </div>
              )}

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
                      : marketType === 'sat_act' ? 'Add context: test date, location, etc.'
                      : isTeacherQuote ? 'Add any extra context about when the teacher typically says this...'
                      : 'Add any additional context...'
                  }
                  className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  maxLength={500}
                />
              </div>

              {/* Resolution Criteria — readonly for teacher_quote */}
              <div className="space-y-1">
                <Label htmlFor="resolutionCriteria">Resolution Criteria *</Label>
                <textarea
                  id="resolutionCriteria"
                  value={resolutionCriteria}
                  onChange={e => !isTeacherQuote && setResolutionCriteria(e.target.value)}
                  readOnly={isTeacherQuote}
                  placeholder={
                    marketType === 'sports' ? 'e.g. Resolved based on the final score posted on MaxPreps.'
                      : marketType === 'personal_score' ? `e.g. Resolved based on ${userName ?? 'my'} grade visible on Canvas once posted.`
                      : marketType === 'score' ? 'e.g. Resolved based on class average visible on Canvas once posted.'
                      : marketType === 'sat_act' ? `e.g. Resolved based on official ${satActType} score report.`
                      : 'e.g. Resolved YES if MCPS officially announces a cancellation.'
                  }
                  className={`w-full min-h-[80px] px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring ${isTeacherQuote ? 'opacity-70 cursor-not-allowed' : ''}`}
                  maxLength={500}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {isTeacherQuote ? 'Pre-filled based on Teacher Quote rules.' : 'Explain exactly how and when this market will be resolved.'}
                </p>
              </div>

              {/* Resolution Source — readonly for teacher_quote */}
              <div className="space-y-1">
                <Label htmlFor="resolutionSource">Resolution Source *</Label>
                <Input
                  id="resolutionSource"
                  value={resolutionSource}
                  onChange={e => !isTeacherQuote && setResolutionSource(e.target.value)}
                  readOnly={isTeacherQuote}
                  placeholder={
                    marketType === 'sports' ? 'e.g. MaxPreps, ESPN, MCPS Athletics website'
                      : marketType === 'sat_act' ? 'e.g. College Board score report, ACT score report'
                      : 'e.g. Canvas gradebook, Google Classroom, MCPS website'
                  }
                  required
                  maxLength={200}
                  className={isTeacherQuote ? 'opacity-70 cursor-not-allowed' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  {isTeacherQuote ? 'Pre-filled: video recording required.' : 'Where can anyone verify the outcome?'}
                </p>
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
                {marketType === 'sat_act' && (
                  <p className="text-xs text-muted-foreground">Typically set to test day morning.</p>
                )}
                {isTeacherQuote && teacherQuoteSubtype === 'overunder' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Required for over/under — appears in the market title.</p>
                )}
                {isTeacherQuote && teacherQuoteSubtype === 'yesno' && (
                  <p className="text-xs text-muted-foreground">Set to the end of the class period or a reasonable deadline.</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Submitting...</> : 'Submit for Review'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
