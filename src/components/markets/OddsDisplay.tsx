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
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-green-600">{yesLabel ?? 'YES'} {yesPct}%</span>
        <span className="text-red-500">{noLabel ?? 'NO'} {noPct}%</span>
      </div>
      <div className="h-3 rounded-full bg-red-100 overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${yesPct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Total pool: {total.toLocaleString()} coins
      </p>
    </div>
  )
}
