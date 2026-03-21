interface OddsDisplayProps {
  yesPrice: number
  noPrice: number
  yesPool: number
  noPool: number
  yesLabel?: string
  noLabel?: string
}

export function OddsDisplay({ yesPrice, noPrice, yesPool, noPool, yesLabel, noLabel }: OddsDisplayProps) {
  const yesPct = Math.round(yesPrice * 100)
  const noPct = Math.round(noPrice * 100)
  const total = yesPool + noPool

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex-1 rounded-xl bg-green-50 dark:bg-sky-500/10 border border-green-200 dark:border-sky-500/25 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-700 dark:text-sky-400">{yesPct}%</p>
          <p className="text-xs text-green-600/70 dark:text-sky-400/70 font-medium mt-0.5">{yesLabel ?? 'YES'}</p>
        </div>
        <div className="flex-1 rounded-xl bg-red-50 dark:bg-orange-500/10 border border-red-200 dark:border-orange-500/25 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-orange-400">{noPct}%</p>
          <p className="text-xs text-red-600/70 dark:text-orange-400/70 font-medium mt-0.5">{noLabel ?? 'NO'}</p>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-red-100 dark:bg-orange-500/30">
        <div className="h-full bg-green-500 dark:bg-sky-500 transition-all duration-500 rounded-full" style={{ width: `${yesPct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground text-center">{total.toLocaleString()} coins in pool</p>
    </div>
  )
}
