import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OddsDisplay } from './OddsDisplay'
import { Market, OptionPool } from '@/types'
import { School } from 'lucide-react'

function MultiOptionDisplay({ options }: { options: OptionPool[] }) {
  const total = options.reduce((s, o) => s + o.amount, 0)
  const show = options.slice(0, 3)
  return (
    <div className="space-y-1.5">
      {show.map(opt => {
        const pct = total === 0 ? Math.round(100 / options.length) : Math.round((opt.amount / total) * 100)
        return (
          <div key={opt.label} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground truncate pr-2">{opt.label}</span>
              <span className="font-medium shrink-0">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
      {options.length > 3 && (
        <p className="text-xs text-muted-foreground">+{options.length - 3} more options</p>
      )}
      <p className="text-xs text-muted-foreground text-center">
        Total pool: {total.toLocaleString()} coins
      </p>
    </div>
  )
}

interface MarketCardProps {
  market: Market & { creator_name?: string }
}

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  pending_resolution: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-gray-100 text-gray-700',
  rejected: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  pending_approval: 'Pending',
  pending_resolution: 'Pending Resolution',
}

export function MarketCard({ market }: MarketCardProps) {
  const isScoreType = market.market_type === 'score' || market.market_type === 'personal_score'
  const isSports = market.market_type === 'sports'
  const total = isScoreType && market.option_pools
    ? market.option_pools.reduce((s, o) => s + o.amount, 0)
    : market.yes_pool + market.no_pool

  return (
    <Link href={`/markets/${market.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{market.title}</CardTitle>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusColors[market.status] || ''}`}>
              {statusLabels[market.status] ?? (market.status.charAt(0).toUpperCase() + market.status.slice(1))}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <School size={11} />
            <span>{market.school}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Type badges */}
          {market.market_type === 'personal_score' && market.subject_name && (
            <p className="text-xs font-medium text-purple-700 bg-purple-50 rounded px-2 py-0.5 w-fit">
              &#x1F4CA; {market.subject_name}&apos;s Score
            </p>
          )}
          {isSports && market.sport && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-orange-700 bg-orange-50 rounded px-2 py-0.5">
                🏆 {market.sport}
              </span>
              {market.team_a && market.team_b && (
                <span className="text-xs text-muted-foreground">
                  {market.team_a} vs {market.team_b}
                </span>
              )}
            </div>
          )}

          {/* Odds / options */}
          {isScoreType && market.option_pools && market.option_pools.length > 0 ? (
            <MultiOptionDisplay options={market.option_pools} />
          ) : isSports && market.team_a && market.team_b ? (
            <OddsDisplay
              yesPrice={market.yes_price ?? 0.5}
              noPrice={market.no_price ?? 0.5}
              yesPool={market.yes_pool}
              noPool={market.no_pool}
              yesLabel={market.team_a}
              noLabel={market.team_b}
            />
          ) : (
            <OddsDisplay
              yesPrice={market.yes_price ?? 0.5}
              noPrice={market.no_price ?? 0.5}
              yesPool={market.yes_pool}
              noPool={market.no_pool}
            />
          )}
          {market.status === 'resolved' && market.outcome && (
            <p className="text-sm font-semibold text-center">
              Resolved: <span className={market.outcome === 'YES' ? 'text-green-600' : 'text-red-500'}>{market.outcome}</span>
            </p>
          )}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{total.toLocaleString()} coins wagered</span>
            {market.closes_at && (
              <span>Closes {new Date(market.closes_at).toLocaleDateString('en-US')}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
