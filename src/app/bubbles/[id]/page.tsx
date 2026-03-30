'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Copy, Check, Plus, LogOut, Trash2, Trophy, Users, TrendingUp } from 'lucide-react'
import { Market, BubbleMember, BubbleJoinRequest } from '@/types'
import { MarketCard } from '@/components/markets/MarketCard'

interface BubbleDetail {
  id: number
  name: string
  description: string | null
  creator_id: number
  invite_code: string
  starting_balance: number
  my_role: 'admin' | 'member' | null
  members: BubbleMember[]
  pending_requests: BubbleJoinRequest[]
}

interface Session {
  id: number
  isAdmin: boolean
}

const TABS = ['Markets', 'Leaderboard', 'Members'] as const
type Tab = typeof TABS[number]

export default function BubblePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const bubbleId = Number(id)

  const [bubble, setBubble] = useState<BubbleDetail | null>(null)
  const [markets, setMarkets] = useState<Market[]>([])
  const [leaderboard, setLeaderboard] = useState<BubbleMember[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [tab, setTab] = useState<Tab>('Markets')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [resolveMarketId, setResolveMarketId] = useState<number | null>(null)
  const [resolveOutcome, setResolveOutcome] = useState('')
  const [resolveNotes, setResolveNotes] = useState('')
  const [resolving, setResolving] = useState(false)

  const load = useCallback(async () => {
    try {
      const [bRes, mRes, lRes, sRes] = await Promise.all([
        fetch(`/api/bubbles/${bubbleId}`),
        fetch(`/api/bubbles/${bubbleId}/markets`),
        fetch(`/api/bubbles/${bubbleId}/leaderboard`),
        fetch('/api/auth/me'),
      ])
      if (!bRes.ok) { setError('Bubble not found or you are not a member'); return }
      const [b, m, l, s] = await Promise.all([bRes.json(), mRes.json(), lRes.json(), sRes.json()])
      setBubble(b)
      if (Array.isArray(m)) setMarkets(m)
      if (Array.isArray(l)) setLeaderboard(l)
      if (s?.id) setSession(s)
    } catch { setError('Failed to load bubble') }
  }, [bubbleId])

  useEffect(() => { load() }, [load])

  const inviteUrl = typeof window !== 'undefined' && bubble
    ? `${window.location.origin}/bubbles/join/${bubble.invite_code}`
    : ''

  async function copyInvite() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRequest(userId: number, action: 'accept' | 'reject') {
    await fetch(`/api/bubbles/${bubbleId}/requests/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    load()
  }

  async function handleLeave() {
    setLeaving(true)
    const res = await fetch(`/api/bubbles/${bubbleId}/leave`, { method: 'POST' })
    if (res.ok) router.push('/bubbles')
    else { const d = await res.json(); alert(d.error || 'Failed to leave'); setLeaving(false) }
  }

  async function handleDelete() {
    if (!confirm('Delete this bubble? All markets and bubble balances will be lost.')) return
    setDeleting(true)
    const res = await fetch(`/api/bubbles/${bubbleId}`, { method: 'DELETE' })
    if (res.ok) router.push('/bubbles')
    else { const d = await res.json(); alert(d.error || 'Failed to delete'); setDeleting(false) }
  }

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault()
    if (!resolveMarketId || !resolveOutcome) return
    setResolving(true)
    const res = await fetch(`/api/bubbles/${bubbleId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ market_id: resolveMarketId, outcome: resolveOutcome, notes: resolveNotes }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Failed to resolve'); setResolving(false); return }
    setResolveMarketId(null)
    setResolveOutcome('')
    setResolveNotes('')
    setResolving(false)
    load()
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">{error}</p>
        <Link href="/bubbles" className="text-sm text-primary hover:underline mt-2 block">← Back to Bubbles</Link>
      </div>
    )
  }

  if (!bubble) {
    return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-muted-foreground text-sm">Loading…</div>
  }

  const isAdmin = bubble.my_role === 'admin' || session?.isAdmin
  const isCreator = session?.id === bubble.creator_id

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-tight">{bubble.name}</h1>
            {bubble.description && <p className="text-sm text-muted-foreground mt-1">{bubble.description}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <Link
                href={`/bubbles/${bubbleId}/markets/create`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                <Plus size={13} /> Market
              </Link>
            )}
            {!isCreator && (
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted disabled:opacity-50 transition-colors"
              >
                <LogOut size={13} /> Leave
              </button>
            )}
            {isCreator && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-xs hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Invite link */}
        {isAdmin && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <span className="text-xs text-muted-foreground font-medium">Invite:</span>
            <code className="flex-1 text-xs truncate">{inviteUrl}</code>
            <button
              onClick={copyInvite}
              className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Markets tab */}
      {tab === 'Markets' && (
        <div className="space-y-4">
          {/* Pending requests (admin only) */}
          {isAdmin && bubble.pending_requests.length > 0 && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-2">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {bubble.pending_requests.length} pending join request{bubble.pending_requests.length > 1 ? 's' : ''}
              </p>
              {bubble.pending_requests.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{r.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequest(r.user_id, 'accept')}
                      className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRequest(r.user_id, 'reject')}
                      className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {markets.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
              No markets yet.{isAdmin && <> <Link href={`/bubbles/${bubbleId}/markets/create`} className="text-primary hover:underline">Create one</Link>.</>}
            </div>
          ) : (
            markets.map(m => (
              <div key={m.id} className="space-y-1">
                <MarketCard market={m} />
                {isAdmin && m.status === 'open' && (
                  <button
                    onClick={() => setResolveMarketId(resolveMarketId === m.id ? null : m.id)}
                    className="text-xs text-muted-foreground hover:text-foreground ml-2"
                  >
                    {resolveMarketId === m.id ? 'Cancel' : 'Resolve this market'}
                  </button>
                )}
                {resolveMarketId === m.id && (
                  <form onSubmit={handleResolve} className="bg-muted/40 rounded-lg p-3 space-y-2 ml-2">
                    <select
                      value={resolveOutcome}
                      onChange={e => setResolveOutcome(e.target.value)}
                      required
                      className="w-full text-sm rounded border border-input bg-background px-2 py-1.5"
                    >
                      <option value="">Select outcome…</option>
                      {(m.market_type === 'score' || m.market_type === 'personal_score') && m.score_subtype !== 'overunder'
                        ? (m.option_pools ?? []).map(op => (
                            <option key={op.label} value={op.label}>{op.label}</option>
                          ))
                        : (<><option value="YES">YES</option><option value="NO">NO</option></>)
                      }
                      <option value="N/A">N/A (Cancel &amp; refund)</option>
                    </select>
                    <textarea
                      value={resolveNotes}
                      onChange={e => setResolveNotes(e.target.value)}
                      placeholder="Resolution notes (optional)"
                      rows={2}
                      className="w-full text-sm rounded border border-input bg-background px-2 py-1.5"
                    />
                    <button
                      type="submit"
                      disabled={resolving}
                      className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                    >
                      {resolving ? 'Resolving…' : 'Confirm Resolution'}
                    </button>
                  </form>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Leaderboard tab */}
      {tab === 'Leaderboard' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {leaderboard.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No members yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="px-4 py-2.5 text-left">#</th>
                  <th className="px-4 py-2.5 text-left">Member</th>
                  <th className="px-4 py-2.5 text-right">Bubble Coins</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((m, i) => (
                  <tr key={m.user_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{m.name}</span>
                      {m.role === 'admin' && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">Admin</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-purple-600 dark:text-purple-400">
                      {m.balance.toLocaleString()} 🟣
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Members tab */}
      {tab === 'Members' && (
        <div className="space-y-2">
          {bubble.members.map(m => (
            <div key={m.user_id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <span className="text-sm font-medium">{m.name}</span>
                  {m.role === 'admin' && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">Admin</span>
                  )}
                </div>
              </div>
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                {m.balance.toLocaleString()} 🟣
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
