import Link from 'next/link'
import { db } from '@/lib/db'
import { School, TrendingUp, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface SchoolStats {
  school: string
  open_markets: number
  total_volume: number
  total_markets: number
}

export default async function SchoolsPage() {
  const res = await db.execute(`
    SELECT
      school,
      COUNT(*) FILTER (WHERE status = 'open') AS open_markets,
      COUNT(*) AS total_markets,
      COALESCE(SUM(yes_pool + no_pool), 0) AS total_volume
    FROM markets
    WHERE status != 'rejected'
    GROUP BY school
    ORDER BY open_markets DESC, total_volume DESC
  `)
  const schools = res.rows as unknown as SchoolStats[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Schools</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse prediction markets by school
        </p>
      </div>

      {schools.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <School size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg">No markets yet.</p>
          <p className="text-sm mt-1">
            <Link href="/markets/submit" className="underline">Submit the first market!</Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {schools.map(s => (
            <Link
              key={s.school}
              href={`/schools/${encodeURIComponent(s.school)}`}
              className="block rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                  <School size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-base leading-tight truncate">{s.school}</h2>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingUp size={13} />
                      {s.open_markets} open market{s.open_markets !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={13} />
                      {s.total_volume.toLocaleString()} coins wagered
                    </span>
                  </div>
                  {s.total_markets > s.open_markets && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {s.total_markets} total markets
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
