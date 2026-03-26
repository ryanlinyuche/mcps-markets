import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { Trophy } from 'lucide-react'
import { LeaderboardTabs } from '@/components/leaderboard/LeaderboardTabs'

export const dynamic = 'force-dynamic'

interface UserRow { id: number; name: string; balance: number }
interface StatRow { id: number; name: string; count: number }

export default async function LeaderboardPage() {
  const session = await getSession()
  const myId = session ? Number(session.sub) : undefined

  const [activeRes, inactiveRes, submittersRes, winsRes, lossesRes, betsRes] = await Promise.all([
    // Active users = have placed at least 1 bet, ranked by balance
    db.execute({
      sql: `SELECT u.id, u.name, u.balance
            FROM users u
            WHERE EXISTS (SELECT 1 FROM positions p WHERE p.user_id = u.id)
            ORDER BY u.balance DESC
            LIMIT 50`,
      args: [],
    }),
    // Inactive users = never placed a bet
    db.execute({
      sql: `SELECT u.id, u.name, u.balance
            FROM users u
            WHERE NOT EXISTS (SELECT 1 FROM positions p WHERE p.user_id = u.id)
              AND u.is_admin = 0
            ORDER BY u.name ASC`,
      args: [],
    }),
    // Most markets submitted (approved / open / resolved)
    db.execute({
      sql: `SELECT u.id, u.name, COUNT(*) as count
            FROM markets m
            JOIN users u ON u.id = m.creator_id
            WHERE m.status NOT IN ('rejected', 'pending_approval')
            GROUP BY u.id, u.name
            ORDER BY count DESC
            LIMIT 5`,
      args: [],
    }),
    // Most bets won
    db.execute({
      sql: `SELECT u.id, u.name, COUNT(*) as count
            FROM positions p
            JOIN markets m ON m.id = p.market_id AND m.status = 'resolved'
            JOIN users u ON u.id = p.user_id
            WHERE p.side = m.outcome
            GROUP BY u.id, u.name
            ORDER BY count DESC
            LIMIT 5`,
      args: [],
    }),
    // Most bets lost
    db.execute({
      sql: `SELECT u.id, u.name, COUNT(*) as count
            FROM positions p
            JOIN markets m ON m.id = p.market_id AND m.status = 'resolved'
            JOIN users u ON u.id = p.user_id
            WHERE p.side != m.outcome AND m.outcome NOT IN ('N/A')
            GROUP BY u.id, u.name
            ORDER BY count DESC
            LIMIT 5`,
      args: [],
    }),
    // Most total bets placed
    db.execute({
      sql: `SELECT u.id, u.name, COUNT(*) as count
            FROM positions p
            JOIN users u ON u.id = p.user_id
            GROUP BY u.id, u.name
            ORDER BY count DESC
            LIMIT 5`,
      args: [],
    }),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Trophy size={24} className="text-amber-500" />
        <h1 className="text-2xl font-bold">Leaderboard</h1>
      </div>

      <LeaderboardTabs
        activeUsers={activeRes.rows as unknown as UserRow[]}
        inactiveUsers={inactiveRes.rows as unknown as UserRow[]}
        winners={winsRes.rows as unknown as StatRow[]}
        losers={lossesRes.rows as unknown as StatRow[]}
        mostBets={betsRes.rows as unknown as StatRow[]}
        submitters={submittersRes.rows as unknown as StatRow[]}
        myId={myId}
      />
    </div>
  )
}
