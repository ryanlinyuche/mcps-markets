import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { User } from '@/types'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { Trophy } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const session = await getSession()

  const res = await db.execute({
    sql: 'SELECT id, name, balance FROM users ORDER BY balance DESC LIMIT 50',
    args: [],
  })
  const users = res.rows as unknown as Pick<User, 'id' | 'name' | 'balance'>[]

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Trophy size={24} className="text-amber-500" />
        <h1 className="text-2xl font-bold">Leaderboard</h1>
      </div>

      <div className="rounded-lg border overflow-hidden">
        {users.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">No users yet.</p>
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
              {users.map((user, i) => {
                const isMe = session && Number(session.sub) === user.id
                return (
                  <tr
                    key={user.id}
                    className={`border-t ${isMe ? 'bg-amber-50' : 'hover:bg-muted/50'}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      {medals[i] || `#${i + 1}`}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {user.name}{isMe && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
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
    </div>
  )
}
