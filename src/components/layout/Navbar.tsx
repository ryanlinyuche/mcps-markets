import Link from 'next/link'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { User } from '@/types'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { LogoutButton } from './LogoutButton'
import { TrendingUp } from 'lucide-react'
import { SearchModal } from './SearchModal'

export async function Navbar() {
  const session = await getSession()
  let balance = 0

  if (session) {
    const res = await db.execute({ sql: 'SELECT balance FROM users WHERE id = ?', args: [Number(session.sub)] })
    balance = (res.rows[0] as unknown as Pick<User, 'balance'> | undefined)?.balance ?? 0
  }

  return (
    <nav className="border-b border-white/8 bg-card/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={session ? '/markets/ongoing' : '/'} className="flex items-center gap-2 font-bold text-lg">
          <TrendingUp size={22} className="text-sky-400" />
          <span>MCPS Markets</span>
        </Link>

        {session ? (
          <div className="flex items-center gap-4">
            <Link href="/winners" className="text-sm text-muted-foreground hover:text-foreground hidden sm:block">
              Winners
            </Link>
            <Link href="/markets/ongoing" className="text-sm text-muted-foreground hover:text-foreground hidden sm:block">
              Markets
            </Link>
            <Link href="/schools" className="text-sm text-muted-foreground hover:text-foreground hidden sm:block">
              Schools
            </Link>
            <Link href="/markets/sports" className="text-sm text-muted-foreground hover:text-foreground hidden sm:block">
              Sports
            </Link>
            <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground hidden sm:block">
              Leaderboard
            </Link>
            <Link href="/rules" className="text-sm text-muted-foreground hover:text-foreground hidden sm:block">
              Rules
            </Link>
            <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground hidden sm:block">
              Profile
            </Link>
            {session.isAdmin && (
              <Link href="/admin" className="text-sm font-medium text-purple-400 hover:text-purple-300 hidden sm:block">
                Admin
              </Link>
            )}
            <SearchModal />
            <CoinDisplay amount={balance} size="sm" />
            <LogoutButton />
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
