'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Users } from 'lucide-react'

interface BubbleInfo {
  id: number
  name: string
  description: string | null
  starting_balance: number
  member_count: number
}

export default function JoinBubblePage() {
  const router = useRouter()
  const { code } = useParams<{ code: string }>()
  const [bubble, setBubble] = useState<BubbleInfo | null>(null)
  const [loadError, setLoadError] = useState('')
  const [joining, setJoining] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [done, setDone] = useState('')

  useEffect(() => {
    fetch(`/api/bubbles/join?code=${code}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setLoadError(d.error)
        else setBubble(d)
      })
      .catch(() => setLoadError('Could not load bubble info'))
  }, [code])

  async function joinViaLink() {
    setJoining(true)
    setActionError('')
    try {
      const res = await fetch('/api/bubbles/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) { setActionError(data.error || 'Failed to join'); return }
      router.push(`/bubbles/${data.bubble_id}`)
    } catch {
      setActionError('Something went wrong')
    } finally {
      setJoining(false)
    }
  }

  async function requestToJoin() {
    if (!bubble) return
    setRequesting(true)
    setActionError('')
    try {
      const res = await fetch(`/api/bubbles/${bubble.id}/request`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setActionError(data.error || 'Failed to send request'); return }
      setDone('Request sent! The bubble admin will review your request.')
    } catch {
      setActionError('Something went wrong')
    } finally {
      setRequesting(false)
    }
  }

  if (loadError) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-red-500">{loadError}</p>
      </div>
    )
  }

  if (!bubble) {
    return <div className="max-w-md mx-auto px-4 py-16 text-center text-muted-foreground text-sm">Loading…</div>
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-xl border border-border bg-card p-8 space-y-6 text-center">
        <div className="space-y-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Users size={28} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold">{bubble.name}</h1>
          {bubble.description && <p className="text-sm text-muted-foreground">{bubble.description}</p>}
          <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-1">
            <span>{bubble.member_count} members</span>
            <span>·</span>
            <span className="text-purple-600 dark:text-purple-400 font-medium">{bubble.starting_balance.toLocaleString()} starting coins</span>
          </div>
        </div>

        {done ? (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">{done}</p>
        ) : (
          <div className="space-y-3">
            {actionError && <p className="text-sm text-red-500">{actionError}</p>}
            <button
              onClick={joinViaLink}
              disabled={joining || requesting}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {joining ? 'Joining…' : 'Join via Invite Link'}
            </button>
            <button
              onClick={requestToJoin}
              disabled={joining || requesting}
              className="w-full h-10 rounded-md border border-border text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
            >
              {requesting ? 'Sending…' : 'Request to Join Instead'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
