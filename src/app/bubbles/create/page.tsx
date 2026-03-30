'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateBubblePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startingBalance, setStartingBalance] = useState('1000')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const inputClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/bubbles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, starting_balance: Number(startingBalance) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create bubble'); return }
      router.push(`/bubbles/${data.id}`)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Create a Bubble</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border rounded-xl p-6">
        <div className="space-y-1">
          <label className="text-sm font-medium">Bubble Name</label>
          <input className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. AP Stats Squad" required minLength={2} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea className={inputClass} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this bubble about?" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Starting Bubble Coins per Member</label>
          <input className={inputClass} type="number" min={1} value={startingBalance} onChange={e => setStartingBalance(e.target.value)} required />
          <p className="text-xs text-muted-foreground">Each member (including you) starts with this many bubble coins. Separate from your global balance.</p>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creating…' : 'Create Bubble'}
        </button>
      </form>
    </div>
  )
}
