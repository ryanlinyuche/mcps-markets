import { db } from '@/lib/db'
import { User } from '@/types'
import { CoinDisplay } from '@/components/shared/CoinDisplay'

export const dynamic = 'force-dynamic'

export default function AdminUsersPage() {
  const users = db.prepare(
    'SELECT id, name, student_id, balance, is_admin, created_at FROM users ORDER BY balance DESC'
  ).all() as User[]

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">All Users ({users.length})</h2>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium">Name</th>
              <th className="text-left px-4 py-3 text-sm font-medium hidden sm:table-cell">Student ID</th>
              <th className="text-right px-4 py-3 text-sm font-medium">Balance</th>
              <th className="text-center px-4 py-3 text-sm font-medium hidden sm:table-cell">Admin</th>
              <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr key={user.id} className={`border-t ${i % 2 === 0 ? '' : 'bg-muted/30'}`}>
                <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{user.student_id}</td>
                <td className="px-4 py-3 text-right"><CoinDisplay amount={user.balance} size="sm" /></td>
                <td className="px-4 py-3 text-center hidden sm:table-cell">
                  {user.is_admin ? '✓' : ''}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
