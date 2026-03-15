import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OddsDisplay } from './OddsDisplay'
import { Market } from '@/types'

interface MarketCardProps {
  market: Market & { creator_name?: string }
}

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-gray-100 text-gray-700',
  rejected: 'bg-red-100 text-red-700',
}

export function MarketCard({ market }: MarketCardProps) {
  const total = market.yes_pool + market.no_pool

  return (
    <Link href={`/markets/${market.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{market.title}</CardTitle>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusColors[market.status] || ''}`}>
              {market.status === 'pending_approval' ? 'Pending' : market.status.charAt(0).toUpperCase() + market.status.slice(1)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <OddsDisplay
            yesPrice={market.yes_price ?? 0.5}
            noPrice={market.no_price ?? 0.5}
            yesPool={market.yes_pool}
            noPool={market.no_pool}
          />
          {market.status === 'resolved' && market.outcome && (
            <p className="text-sm font-semibold text-center">
              Resolved: <span className={market.outcome === 'YES' ? 'text-green-600' : 'text-red-500'}>{market.outcome}</span>
            </p>
          )}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{total.toLocaleString()} coins wagered</span>
            {market.closes_at && (
              <span>Closes {new Date(market.closes_at).toLocaleDateString()}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
