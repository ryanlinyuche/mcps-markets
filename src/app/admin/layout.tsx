import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || !session.isAdmin) {
    redirect('/markets')
  }
  return (
    <div>
      <div className="mb-6 pb-4 border-b">
        <h1 className="text-lg font-bold text-purple-700">Admin Panel</h1>
        <nav className="flex gap-4 mt-2 text-sm">
          <a href="/admin" className="text-muted-foreground hover:text-foreground">Dashboard</a>
          <a href="/admin/markets" className="text-muted-foreground hover:text-foreground">Manage Markets</a>
          <a href="/admin/users" className="text-muted-foreground hover:text-foreground">Users</a>
        </nav>
      </div>
      {children}
    </div>
  )
}
