'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { Trophy, BarChart2 } from 'lucide-react'

interface TopUser { id: number; name: string; balance: number }
interface TopSubmitter { id: number; name: string; market_count: number }

const medals = ['🥇', '🥈', '🥉']

export function TopStatsPanel() {
  const [topUsers, setTopUsers] = useState<TopUser[]>([])
  const [topSubmitters, setTopSubmitters] = useState<TopSubmitter[]>([])

  useEffect(() => {
    fetch('/api/leaderboard/top')
      .then(r => r.json())
      .then(d => {
        if (d.topUsers) setTopUsers(d.topUsers)
        if (d.topSubmitters) setTopSubmitters(d.topSubmitters)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Top 3 Users */}
      <div className="rounded-xl border border-border bg-card p-4 flex-1">
        <div className="flex items-center gap-1.5 mb-3">
          <Trophy size={14} className="text-amber-500" />
          <span className="text-sm font-semibold">Top 3 Users</span>
        </div>
        {topUsers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active bettors yet.</p>
        ) : (
          <div className="space-y-2">
            {topUsers.map((u, i) => (
              <div key={u.id} className="flex items-center gap-2">
                <span className="text-base leading-none w-5 shrink-0">{medals[i]}</span>
                <Link href={`/profile/${u.id}`} className="text-sm font-medium hover:underline truncate flex-1">
                  {u.name}
                </Link>
                <CoinDisplay amount={u.balance} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top 3 Market Submitters */}
      <div className="rounded-xl border border-border bg-card p-4 flex-1">
        <div className="flex items-center gap-1.5 mb-3">
          <BarChart2 size={14} className="text-sky-500" />
          <span className="text-sm font-semibold">Top 3 Submitters</span>
        </div>
        {topSubmitters.length === 0 ? (
          <p className="text-xs text-muted-foreground">No markets submitted yet.</p>
        ) : (
          <div className="space-y-2">
            {topSubmitters.map((u, i) => (
              <div key={u.id} className="flex items-center gap-2">
                <span className="text-base leading-none w-5 shrink-0">{medals[i]}</span>
                <Link href={`/profile/${u.id}`} className="text-sm font-medium hover:underline truncate flex-1">
                  {u.name}
                </Link>
                <span className="text-xs text-muted-foreground shrink-0">{u.market_count} market{u.market_count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
