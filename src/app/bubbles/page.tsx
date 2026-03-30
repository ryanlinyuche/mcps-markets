'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Users, Coins } from 'lucide-react'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { Bubble } from '@/types'

export default function BubblesPage() {
  const router = useRouter()
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/bubbles')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setBubbles(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bubbles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Private betting groups with their own currency</p>
        </div>
        <Link
          href="/bubbles/create"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus size={15} />
          Create
        </Link>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : bubbles.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
          <p className="text-muted-foreground text-sm">You&apos;re not in any bubble yet.</p>
          <div className="flex justify-center gap-3">
            <Link href="/bubbles/create" className="text-sm text-primary hover:underline font-medium">
              Create a bubble
            </Link>
            <span className="text-muted-foreground text-sm">or</span>
            <span className="text-sm text-muted-foreground">use an invite link to join one</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {bubbles.map(b => (
            <Link
              key={b.id}
              href={`/bubbles/${b.id}`}
              className="block rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base truncate">{b.name}</span>
                    {b.my_role === 'admin' && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">Admin</span>
                    )}
                  </div>
                  {b.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{b.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <div className="flex items-center gap-1 text-sm font-semibold text-purple-600 dark:text-purple-400 justify-end">
                    <Coins size={14} />
                    {b.my_balance?.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                    <Users size={12} />
                    {b.member_count ?? 0} members
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
