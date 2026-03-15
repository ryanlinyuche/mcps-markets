'use client'

import { Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CoinDisplayProps {
  amount: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function CoinDisplay({ amount, className, size = 'md' }: CoinDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm gap-1',
    md: 'text-base gap-1.5',
    lg: 'text-xl gap-2',
  }
  const iconSize = { sm: 14, md: 16, lg: 20 }

  return (
    <span className={cn('inline-flex items-center font-semibold text-amber-600', sizeClasses[size], className)}>
      <Coins size={iconSize[size]} />
      {amount.toLocaleString()}
    </span>
  )
}
