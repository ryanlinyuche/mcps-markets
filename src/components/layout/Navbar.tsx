import Link from 'next/link'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { User } from '@/types'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { LogoutButton } from './LogoutButton'
import { TrendingUp } from 'lucide-react'
import { SearchModal } from './SearchModal'
import { SideDrawer } from './SideDrawer'

export async function Navbar() {
  const session = await getSession()
  let balance = 0

  if (session) {
    const res = await db.execute({ sql: 'SELECT balance FROM users WHERE id = ?', args: [Number(session.sub)] })
    balance = (res.rows[0] as unknown as Pick<User, 'balance'> | undefined)?.balance ?? 0
  }

  return (
    <nav className="border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href={session ? '/markets/ongoing' : '/'} className="flex items-center gap-2 font-bold text-lg shrink-0">
          <TrendingUp size={22} className="text-sky-400" />
          <span>MCPS Markets</span>
        </Link>

        {session ? (
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Primary nav links */}
            <Link href="/markets/ongoing" className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors hidden md:block">
              Markets
            </Link>
            <Link href="/schools" className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors hidden md:block">
              Schools
            </Link>
            <Link href="/markets/sports" className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors hidden md:block">
              Sports
            </Link>
            <Link href="/rules" className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors hidden lg:block">
              Rules
            </Link>

            {/* Always-visible actions */}
            <SearchModal />
            <CoinDisplay amount={balance} size="sm" />
            <LogoutButton />

            {/* Hamburger — side drawer with Winners, Leaderboard, Activity, Profile, Admin, Theme */}
            <SideDrawer isAdmin={session.isAdmin} />
          </div>
        ) : (
          <Link href="/login" className="text-sm font-medium hover:underline">
            Login
          </Link>
        )}
      </div>
    </nav>
  )
}
