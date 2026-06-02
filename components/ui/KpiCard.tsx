'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/formatters'

interface KpiCardProps {
  title: string
  value: string
  subValue?: string
  change?: number
  icon?: React.ReactNode
  variant?: 'default' | 'profit' | 'loss' | 'accent'
  className?: string
}

const variantBorder: Record<string, string> = {
  default: 'border-l-4 border-l-border',
  profit: 'border-l-4 border-l-profit',
  loss: 'border-l-4 border-l-loss',
  accent: 'border-l-4 border-l-accent',
}

const variantValue: Record<string, string> = {
  default: 'text-text-primary',
  profit: 'text-profit',
  loss: 'text-loss',
  accent: 'text-accent',
}

export function KpiCard({ title, value, subValue, change, icon, variant = 'default', className }: KpiCardProps) {
  return (
    <div className={cn('card p-5', variantBorder[variant], className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider truncate">{title}</p>
          <p className={cn('text-2xl font-bold mt-1 tabular-nums', variantValue[variant])}>{value}</p>
          {subValue && <p className="text-xs text-text-muted mt-1">{subValue}</p>}
        </div>
        <div className="ml-3 flex flex-col items-end gap-1">
          {icon && <div className="text-text-muted">{icon}</div>}
          {change !== undefined && (
            <div
              className={cn(
                'flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full',
                change >= 0 ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
              )}
            >
              {change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
