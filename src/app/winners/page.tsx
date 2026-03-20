import { db } from '@/lib/db'
import { CoinDisplay } from '@/components/shared/CoinDisplay'
import { Trophy, Crown } from 'lucide-react'

export const dynamic = 'force-dynamic'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface MonthlyWinner {
  year: number
  month: number
  user_name: string
  coins: number
  recorded_at: string
}

async function fetchWinners() {
  const res = await db.execute({
    sql: 'SELECT year, month, user_name, coins, recorded_at FROM monthly_winners ORDER BY year DESC, month DESC',
    args: [],
  })
  return res.rows as unknown as MonthlyWinner[]
}

export default async function WinnersPage() {
  const winners = await fetchWinners()

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Crown size={24} className="text-yellow-500" />
        <h1 className="text-2xl font-bold">Monthly Winners</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        The player with the most coins at the end of each month wins. Coins never reset — keep growing your balance!
      </p>

      {winners.length === 0 ? (
        <div className="rounded-lg border p-10 text-center text-muted-foreground">
          <Trophy size={40} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-medium">No winners yet</p>
          <p className="text-sm mt-1">The first winner will be recorded at the end of this month.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {winners.map((w, i) => (
            <div
              key={`${w.year}-${w.month}`}
              className={`rounded-lg border p-4 flex items-center justify-between ${i === 0 ? 'border-yellow-400 bg-yellow-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`text-2xl ${i === 0 ? '' : 'grayscale opacity-60'}`}>
                  {i === 0 ? '👑' : '🏆'}
                </div>
                <div>
                  <p className="font-semibold">{w.user_name}</p>
                  <p className="text-sm text-muted-foreground">{MONTH_NAMES[w.month - 1]} {w.year}</p>
                </div>
              </div>
              <CoinDisplay amount={w.coins} size="sm" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
