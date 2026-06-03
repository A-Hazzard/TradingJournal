import { startOfWeek, startOfMonth, format } from 'date-fns'
import type { Trade } from '@/types/trade'

export type SharePeriod = 'week' | 'month' | 'alltime'

export function filterTradesByPeriod(trades: Trade[], period: SharePeriod): Trade[] {
  if (period === 'alltime') return trades

  const now = new Date()
  const start = period === 'week' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now)
  return trades.filter((t) => new Date(t.entryDateTime) >= start)
}

export function getPeriodLabel(period: SharePeriod): string {
  if (period === 'alltime') return 'All Time'
  if (period === 'week') return `Week of ${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d, yyyy')}`
  return format(new Date(), 'MMMM yyyy')
}
