import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { User, Position, Transaction, ClassPeriod } from '@/types'
import { Trophy, TrendingUp, TrendingDown, Coins, BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(session.sub)) as User

  // Leaderboard rank
  const rank = (db.prepare(`
    SELECT COUNT(*) + 1 AS rank FROM users WHERE balance > ?
  `).get(user.balance) as { rank: number }).rank

  // Positions with market info
  const positions = db.prepare(`
    SELECT p.*, m.title as market_title, m.status as market_status, m.outcome as market_outcome
    FROM positions p
    JOIN markets m ON p.market_id = m.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `).all(user.id) as (Position & { market_title: string; market_status: string; market_outcome: string | null })[]

  // Transactions
  const transactions = db.prepare(`
    SELECT t.*, m.title as market_title
    FROM transactions t
    LEFT JOIN markets m ON t.market_id = m.id
    WHERE t.user_id = ?
    ORDER BY t.created_at DESC
    LIMIT 100
  `).all(user.id) as (Transaction & { market_title: string | null })[]

  // Class schedule
  const schedule = db.prepare(`
    SELECT period, course_title, teacher, room, course_code
    FROM user_schedule WHERE user_id = ?
    ORDER BY CAST(period AS INTEGER)
  `).all(user.id) as ClassPeriod[]

  // Win/loss stats
  const resolved = positions.filter(p => p.market_status === 'resolved' && p.market_outcome)
  const wins = resolved.filter(p => p.market_outcome === p.side).length
  const losses = resolved.length - wins
  const activePositions = positions.filter(p => p.market_status === 'open').length

  const statCards: { label: string; value: React.ReactNode; icon: React.ComponentType<{ size?: number }> }[] = [
    { label: 'Balance', value: <CoinDisplay amount={user.balance} />, icon: Coins },
    { label: 'Rank', value: `#${rank}`, icon: Trophy },
    { label: 'Active Bets', value: activePositions, icon: TrendingUp },
    { label: 'W / L', value: `${wins} / ${losses}`, icon: resolved.length > 0 && wins > losses ? TrendingUp : TrendingDown },
    { label: 'Classes', value: schedule.length > 0 ? `${schedule.length} periods` : '—', icon: BookOpen },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Student ID: {user.student_id}
          {user.name !== user.student_id && (
            <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
              Synced from StudentVUE
            </span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Icon size={11} />
              {label}
            </p>
            <div className="text-lg font-bold">{value}</div>
          </div>
        ))}
      </div>

      {/* Class Schedule */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <BookOpen size={15} />
          My Schedule
          {schedule.length === 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              (synced from StudentVUE on next login)
            </span>
          )}
        </h2>
        {schedule.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center border rounded-lg">
            Schedule not loaded yet — log out and back in to sync from StudentVUE.
          </p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-16">Period</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Course</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Teacher</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell w-16">Room</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((cls, i) => (
                  <tr key={cls.period} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                    <td className="px-3 py-2 font-semibold text-center text-primary">{cls.period}</td>
                    <td className="px-3 py-2 font-medium">{cls.course_title}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{cls.teacher ?? '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{cls.room ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabs via anchor + CSS (server component, no JS needed) */}
      <div className="space-y-4">
        {/* Positions */}
        <div>
          <h2 className="text-base font-semibold mb-3">
            Positions <span className="text-muted-foreground font-normal text-sm">({positions.length})</span>
          </h2>
          {positions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center border rounded-lg">
              No positions yet.{' '}
              <Link href="/markets" className="underline">Browse markets</Link> to start betting.
            </p>
          ) : (
            <div className="space-y-2">
              {positions.map(pos => (
                <Link href={`/markets/${pos.market_id}`} key={pos.id}>
                  <div className="rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-sm font-medium leading-snug">{pos.market_title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pos.side === 'YES' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {pos.side}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">{pos.market_status.replace('_', ' ')}</span>
                          {pos.market_outcome && (
                            <span className={`text-xs font-semibold ${pos.market_outcome === pos.side ? 'text-green-600' : 'text-red-500'}`}>
                              {pos.market_outcome === pos.side ? '✓ Won' : '✗ Lost'}
                            </span>
                          )}
                        </div>
                      </div>
                      <CoinDisplay amount={pos.coins_bet} size="sm" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Transactions */}
        <div>
          <h2 className="text-base font-semibold mb-3">
            Transaction History <span className="text-muted-foreground font-normal text-sm">({transactions.length})</span>
          </h2>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center border rounded-lg">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="rounded-lg border p-3 flex justify-between items-center gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description || tx.type}</p>
                    {tx.market_title && (
                      <p className="text-xs text-muted-foreground truncate">{tx.market_title}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-semibold text-sm whitespace-nowrap ${tx.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
