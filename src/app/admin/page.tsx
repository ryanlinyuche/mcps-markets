import { db } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const [pendingRes, openRes, resolvedRes, userRes] = await Promise.all([
    db.execute({ sql: "SELECT COUNT(*) as c FROM markets WHERE status = 'pending_approval'", args: [] }),
    db.execute({ sql: "SELECT COUNT(*) as c FROM markets WHERE status = 'open'", args: [] }),
    db.execute({ sql: "SELECT COUNT(*) as c FROM markets WHERE status = 'resolved'", args: [] }),
    db.execute({ sql: 'SELECT COUNT(*) as c FROM users', args: [] }),
  ])

  const pendingCount = (pendingRes.rows[0] as unknown as { c: number }).c
  const openCount = (openRes.rows[0] as unknown as { c: number }).c
  const resolvedCount = (resolvedRes.rows[0] as unknown as { c: number }).c
  const userCount = (userRes.rows[0] as unknown as { c: number }).c

  const stats = [
    { label: 'Pending Approval', value: pendingCount, href: '/admin/markets', color: 'text-yellow-600' },
    { label: 'Open Markets', value: openCount, href: '/admin/markets', color: 'text-green-600' },
    { label: 'Resolved', value: resolvedCount, href: '/admin/markets', color: 'text-gray-600' },
    { label: 'Total Users', value: userCount, href: '/admin/users', color: 'text-blue-600' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Overview</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Link href={stat.href} key={stat.label}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
