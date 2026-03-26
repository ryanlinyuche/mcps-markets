import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { Trophy, TrendingUp, TrendingDown, BarChart2, Flame } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface UserRow { id: number; name: string; balance: number }
interface StatRow { id: number; name: string; count: number }

const medals = ['🥇', '🥈', '🥉']

function StatTable({
  title,
  icon,
  rows,
  valueLabel,
  sessionId,
}: {
  title: string
  icon: React.ReactNode
  rows: StatRow[]
  valueLabel: string
  sessionId?: number
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
              const isMe = sessionId === row.id
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

export default async function LeaderboardPage() {
  const session = await getSession()
  const myId = session ? Number(session.sub) : undefined

  // Active users = have placed at least 1 bet
  const activeRes = await db.execute({
    sql: `SELECT u.id, u.name, u.balance
          FROM users u
          WHERE EXISTS (SELECT 1 FROM positions p WHERE p.user_id = u.id)
          ORDER BY u.balance DESC
          LIMIT 50`,
    args: [],
  })
  const activeUsers = activeRes.rows as unknown as UserRow[]

  // Inactive users = never placed a bet
  const inactiveRes = await db.execute({
    sql: `SELECT u.id, u.name, u.balance
          FROM users u
          WHERE NOT EXISTS (SELECT 1 FROM positions p WHERE p.user_id = u.id)
            AND u.is_admin = 0
          ORDER BY u.name ASC`,
    args: [],
  })
  const inactiveUsers = inactiveRes.rows as unknown as UserRow[]

  // Most markets submitted (approved / open / resolved)
  const submittersRes = await db.execute({
    sql: `SELECT u.id, u.name, COUNT(*) as count
          FROM markets m
          JOIN users u ON u.id = m.creator_id
          WHERE m.status NOT IN ('rejected', 'pending_approval')
          GROUP BY u.id, u.name
          ORDER BY count DESC
          LIMIT 5`,
    args: [],
  })

  // Most bets won
  const winsRes = await db.execute({
    sql: `SELECT u.id, u.name, COUNT(*) as count
          FROM positions p
          JOIN markets m ON m.id = p.market_id AND m.status = 'resolved'
          JOIN users u ON u.id = p.user_id
          WHERE p.side = m.outcome
          GROUP BY u.id, u.name
          ORDER BY count DESC
          LIMIT 5`,
    args: [],
  })

  // Most bets lost
  const lossesRes = await db.execute({
    sql: `SELECT u.id, u.name, COUNT(*) as count
          FROM positions p
          JOIN markets m ON m.id = p.market_id AND m.status = 'resolved'
          JOIN users u ON u.id = p.user_id
          WHERE p.side != m.outcome AND m.outcome NOT IN ('N/A')
          GROUP BY u.id, u.name
          ORDER BY count DESC
          LIMIT 5`,
    args: [],
  })

  // Most total bets placed
  const betsRes = await db.execute({
    sql: `SELECT u.id, u.name, COUNT(*) as count
          FROM positions p
          JOIN users u ON u.id = p.user_id
          GROUP BY u.id, u.name
          ORDER BY count DESC
          LIMIT 5`,
    args: [],
  })

  const submitters = submittersRes.rows as unknown as StatRow[]
  const winners = winsRes.rows as unknown as StatRow[]
  const losers = lossesRes.rows as unknown as StatRow[]
  const mostBets = betsRes.rows as unknown as StatRow[]

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Trophy size={24} className="text-amber-500" />
        <h1 className="text-2xl font-bold">Leaderboard</h1>
      </div>

      {/* ── Main leaderboard (active bettors) ── */}
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide text-xs px-1">
          🏆 Rankings
        </h2>
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
      </section>

      {/* ── Stat sections ── */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
          📊 Statistics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatTable
            title="Most Bets Won"
            icon={<TrendingUp size={14} className="text-green-500" />}
            rows={winners}
            valueLabel="wins"
            sessionId={myId}
          />
          <StatTable
            title="Most Bets Lost"
            icon={<TrendingDown size={14} className="text-red-500" />}
            rows={losers}
            valueLabel="losses"
            sessionId={myId}
          />
          <StatTable
            title="Most Active Bettor"
            icon={<Flame size={14} className="text-orange-500" />}
            rows={mostBets}
            valueLabel="bets"
            sessionId={myId}
          />
          <StatTable
            title="Most Markets Submitted"
            icon={<BarChart2 size={14} className="text-sky-500" />}
            rows={submitters}
            valueLabel="markets"
            sessionId={myId}
          />
        </div>
      </section>

      {/* ── Haven't bet yet ── */}
      {inactiveUsers.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            😴 Haven&apos;t Bet Yet
          </h2>
          <p className="text-xs text-muted-foreground px-1">
            These users haven&apos;t placed a bet. They don&apos;t earn daily coins and will be removed after 1 month.
          </p>
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
        </section>
      )}
    </div>
  )
}
