import Link from 'next/link'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { User } from '@/types'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { LogoutButton } from './LogoutButton'
import { TrendingUp, Trophy } from 'lucide-react'
import { InlineSearch } from './InlineSearch'
import { NotificationBell } from './NotificationBell'
import { SideDrawer } from './SideDrawer'

export async function Navbar() {
  const session = await getSession()
  let balance = 0
  let userName = ''

  if (session) {
    const res = await db.execute({
      sql: 'SELECT balance, name FROM users WHERE id = ?',
      args: [Number(session.sub)],
    })
    const row = res.rows[0] as unknown as Pick<User, 'balance' | 'name'> | undefined
    balance = row?.balance ?? 0
    userName = row?.name ?? session.name ?? ''
  }

  const initial = userName.charAt(0).toUpperCase() || '?'

  return (
    <nav className="border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">

        {/* Logo */}
        <Link
          href={session ? '/markets/ongoing' : '/'}
          className="flex items-center gap-2 font-bold text-base shrink-0"
        >
          <TrendingUp size={20} className="text-sky-400" />
          <span className="hidden sm:inline">MCPS Markets</span>
        </Link>

        {session ? (
          <>
            {/* Center: inline search */}
            <div className="flex-1 flex justify-center px-2">
              <InlineSearch />
            </div>

            {/* Right: leaderboard | coins | bell | avatar | logout (sm+) | hamburger */}
            <div className="flex items-center gap-1 shrink-0">
              <Link
                href="/leaderboard"
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
                aria-label="Leaderboard"
                title="Leaderboard"
              >
                <Trophy size={16} className="text-amber-500" />
              </Link>
              <CoinDisplay amount={balance} size="sm" />
              <NotificationBell />

              {/* Profile avatar → own profile */}
              <Link
                href="/profile"
                className="w-8 h-8 rounded-full bg-primary/15 hover:bg-primary/25 flex items-center justify-center text-sm font-bold text-primary transition-colors"
                aria-label="My profile"
                title={userName}
              >
                {initial}
              </Link>

              {/* Hide logout on mobile — accessible via side drawer */}
              <span className="hidden sm:block">
                <LogoutButton />
              </span>

              {/* Hamburger side drawer: Winners, Leaderboard, Activity, Admin, Theme */}
              <SideDrawer isAdmin={session.isAdmin} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex justify-end">
            <Link href="/login" className="text-sm font-medium hover:underline">
              Login
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
