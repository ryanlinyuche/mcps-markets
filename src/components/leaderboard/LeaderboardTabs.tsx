'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { TrendingUp, TrendingDown, BarChart2, Flame } from 'lucide-react'

interface UserRow { id: number; name: string; balance: number }
interface StatRow { id: number; name: string; count: number }

interface Props {
  activeUsers: UserRow[]
  inactiveUsers: UserRow[]
  winners: StatRow[]
  losers: StatRow[]
  mostBets: StatRow[]
  submitters: StatRow[]
  myId?: number
}

const medals = ['🥇', '🥈', '🥉']

function StatTable({
  title,
  icon,
  rows,
  valueLabel,
  myId,
}: {
  title: string
  icon: React.ReactNode
  rows: StatRow[]
  valueLabel: string
  myId?: number
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted border-b">
        {icon}
        <span className="font-semibold text-sm">{title}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-center py-6 text-muted-foreground text-sm">No data yet.</p>
      ) : (
        <table className="w-full">
          <tbody>
            {rows.map((row, i) => {
              const isMe = myId === row.id
              return (
                <tr key={row.id} className={`border-t ${isMe ? 'bg-amber-50 dark:bg-amber-500/10' : 'hover:bg-muted/50'}`}>
                  <td className="px-4 py-2.5 text-sm w-10">{medals[i] ?? `#${i + 1}`}</td>
                  <td className="px-4 py-2.5 text-sm">
                    <Link href={`/profile/${row.id}`} className="font-medium hover:text-primary hover:underline transition-colors">
                      {row.name}
                    </Link>
                    {isMe && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-right text-muted-foreground">
                    {row.count} {valueLabel}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function LeaderboardTabs({ activeUsers, inactiveUsers, winners, losers, mostBets, submitters, myId }: Props) {
  const [tab, setTab] = useState<'rankings' | 'stats'>('rankings')

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('rankings')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'rankings'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          🏆 Rankings
        </button>
        <button
          onClick={() => setTab('stats')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'stats'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          📊 Statistics
        </button>
      </div>

      {/* Rankings tab */}
      {tab === 'rankings' && (
        <div className="space-y-6">
          {/* Active bettors */}
          <div className="rounded-lg border overflow-hidden">
            {activeUsers.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">No active bettors yet.</p>
            ) : (
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium">Rank</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Name</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {activeUsers.map((user, i) => {
                    const isMe = myId === user.id
                    return (
                      <tr key={user.id} className={`border-t ${isMe ? 'bg-amber-50 dark:bg-amber-500/10' : 'hover:bg-muted/50'}`}>
                        <td className="px-4 py-3 text-sm font-medium">{medals[i] ?? `#${i + 1}`}</td>
                        <td className="px-4 py-3 text-sm">
                          <Link href={`/profile/${user.id}`} className="font-medium hover:text-primary hover:underline transition-colors">
                            {user.name}
                          </Link>
                          {isMe && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CoinDisplay amount={user.balance} size="sm" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Inactive bettors */}
          {inactiveUsers.length > 0 && (
            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  😴 Haven&apos;t Bet Yet
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No daily coins until they place a bet. Removed after 1 month.
                </p>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full">
                  <tbody>
                    {inactiveUsers.map((user) => {
                      const isMe = myId === user.id
                      return (
                        <tr key={user.id} className={`border-t first:border-t-0 ${isMe ? 'bg-amber-50 dark:bg-amber-500/10' : 'hover:bg-muted/50'}`}>
                          <td className="px-4 py-2.5 text-sm">
                            <Link href={`/profile/${user.id}`} className="font-medium hover:text-primary hover:underline transition-colors">
                              {user.name}
                            </Link>
                            {isMe && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <CoinDisplay amount={user.balance} size="sm" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats tab */}
      {tab === 'stats' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatTable
            title="Most Bets Won"
            icon={<TrendingUp size={14} className="text-green-500" />}
            rows={winners}
            valueLabel="wins"
            myId={myId}
          />
          <StatTable
            title="Most Bets Lost"
            icon={<TrendingDown size={14} className="text-red-500" />}
            rows={losers}
            valueLabel="losses"
            myId={myId}
          />
          <StatTable
            title="Most Active Bettor"
            icon={<Flame size={14} className="text-orange-500" />}
            rows={mostBets}
            valueLabel="bets"
            myId={myId}
          />
          <StatTable
            title="Most Markets Submitted"
            icon={<BarChart2 size={14} className="text-sky-500" />}
            rows={submitters}
            valueLabel="markets"
            myId={myId}
          />
        </div>
      )}
    </div>
  )
}
