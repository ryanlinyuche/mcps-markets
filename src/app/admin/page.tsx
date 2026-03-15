import { db } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default function AdminDashboard() {
  const pendingCount = (db.prepare("SELECT COUNT(*) as c FROM markets WHERE status = 'pending_approval'").get() as { c: number }).c
  const openCount = (db.prepare("SELECT COUNT(*) as c FROM markets WHERE status = 'open'").get() as { c: number }).c
  const resolvedCount = (db.prepare("SELECT COUNT(*) as c FROM markets WHERE status = 'resolved'").get() as { c: number }).c
  const userCount = (db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c

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
