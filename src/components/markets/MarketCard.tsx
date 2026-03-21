import Link from 'next/link'
import { Market, OptionPool } from '@/types'

function MultiOptionDisplay({ options }: { options: OptionPool[] }) {
  const total = options.reduce((s, o) => s + o.amount, 0)
  const top = options.slice(0, 3)
  return (
    <div className="space-y-2">
      {top.map(opt => {
        const pct = total === 0 ? Math.round(100 / options.length) : Math.round((opt.amount / total) * 100)
        return (
          <div key={opt.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground truncate pr-2">{opt.label}</span>
              <span className="font-semibold text-foreground">{pct}%</span>
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
      {options.length > 3 && (
        <p className="text-xs text-muted-foreground">+{options.length - 3} more options</p>
      )}
    </div>
  )
}

interface MarketCardProps {
  market: Market & { creator_name?: string }
}

const statusConfig: Record<string, { label: string; className: string }> = {
  open:               { label: 'Open',       className: 'bg-sky-500/15 text-sky-400 border border-sky-500/30' },
  pending_approval:   { label: 'Pending',    className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' },
  pending_resolution: { label: 'Resolving',  className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
  resolved:           { label: 'Resolved',   className: 'bg-purple-500/15 text-purple-400 border border-purple-500/30' },
  rejected:           { label: 'Rejected',   className: 'bg-red-500/15 text-red-400 border border-red-500/30' },
}

export function MarketCard({ market }: MarketCardProps) {
  const isScore = market.market_type === 'score' || market.market_type === 'personal_score'
  const isSports = market.market_type === 'sports'
  const isSatAct = market.market_type === 'sat_act'
  const isOverUnder = market.score_subtype === 'overunder'
  const status = statusConfig[market.status] ?? { label: market.status, className: 'bg-muted text-muted-foreground' }
  const total = isScore && market.option_pools
    ? market.option_pools.reduce((s, o) => s + o.amount, 0)
    : market.yes_pool + market.no_pool
  const yesPct = Math.round((market.yes_price ?? 0.5) * 100)
  const noPct = 100 - yesPct
  const yesLabel = isSports && market.team_a ? market.team_a : isOverUnder || isSatAct ? `Over ${market.score_threshold}` : 'YES'
  const noLabel  = isSports && market.team_b ? market.team_b : isOverUnder || isSatAct ? `Under ${market.score_threshold}` : 'NO'

  return (
    <Link href={`/markets/${market.id}`}>
      <div className="group rounded-2xl border border-white/8 bg-card hover:border-sky-500/40 hover:bg-sky-500/5 transition-all duration-200 p-4 h-full flex flex-col gap-3 cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Type pill */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.className}`}>
                {status.label}
              </span>
              {market.market_type === 'personal_score' && market.subject_name && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  📊 {market.subject_name}
                </span>
              )}
              {isSports && market.sport && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  🏆 {market.sport}
                </span>
              )}
              {isSatAct && market.sport && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  📝 {market.sport}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-sky-200 transition-colors line-clamp-2">
              {market.title}
            </h3>
          </div>
        </div>

        {/* Odds */}
        <div className="flex-1">
          {isScore && !isOverUnder && market.option_pools && market.option_pools.length > 0 ? (
            <MultiOptionDisplay options={market.option_pools} />
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg bg-sky-500/10 border border-sky-500/20 py-2 px-3 text-center">
                  <p className="text-base font-bold text-sky-400">{yesPct}%</p>
                  <p className="text-[10px] text-sky-400/60 truncate">{yesLabel}</p>
                </div>
                <div className="flex-1 rounded-lg bg-orange-500/10 border border-orange-500/20 py-2 px-3 text-center">
                  <p className="text-base font-bold text-orange-400">{noPct}%</p>
                  <p className="text-[10px] text-orange-400/60 truncate">{noLabel}</p>
                </div>
              </div>
              <div className="h-1 rounded-full bg-orange-500/20 overflow-hidden">
                <div className="h-full bg-sky-500 transition-all duration-300" style={{ width: `${yesPct}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 border-t border-white/5">
          <span>{total.toLocaleString()} coins</span>
          {market.closes_at && (
            <span>Closes {new Date(market.closes_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          )}
          {market.status === 'resolved' && market.outcome && (
            <span className="text-purple-400 font-medium">→ {market.outcome}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
