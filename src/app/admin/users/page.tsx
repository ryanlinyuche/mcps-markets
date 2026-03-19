'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { User } from '@/types'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { toast } from 'sonner'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(setUsers).finally(() => setLoading(false))
  }, [])

  async function toggleAdmin(user: User) {
    setToggling(user.id)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: user.student_id, is_admin: !user.is_admin }),
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_admin: user.is_admin ? 0 : 1 } : u))
        toast.success(`${user.name} is ${user.is_admin ? 'no longer' : 'now'} an admin`)
      } else {
        toast.error('Failed to update')
      }
    } catch {
      toast.error('Something went wrong')
    }
    setToggling(null)
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading...</p>

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
              <th className="text-center px-4 py-3 text-sm font-medium">Admin</th>
              <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr key={user.id} className={`border-t ${i % 2 === 0 ? '' : 'bg-muted/30'}`}>
                <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{user.student_id}</td>
                <td className="px-4 py-3 text-right"><CoinDisplay amount={user.balance} size="sm" /></td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleAdmin(user)}
                    disabled={toggling === user.id}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors disabled:opacity-50 ${
                      user.is_admin
                        ? 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {toggling === user.id ? '...' : user.is_admin ? 'Admin' : 'Make Admin'}
                  </button>
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
