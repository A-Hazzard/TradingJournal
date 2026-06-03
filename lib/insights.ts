import type { HourStat, DayOfWeekStat, DurationStat } from '@/types/chart'
import { formatCurrency } from '@/lib/formatters'

export function generateTimeInsight(hours: HourStat[]): string | null {
  const significant = hours.filter((h) => h.count >= 2)
  if (significant.length < 2) return null
  const best = significant.reduce((a, b) => (a.avgPnl > b.avgPnl ? a : b))
  const worst = significant.reduce((a, b) => (a.avgPnl < b.avgPnl ? a : b))
  if (best.hour === worst.hour) return null
  return `Your most profitable hour is ${best.hourLabel} (${formatCurrency(best.avgPnl)} avg). ${
    worst.avgPnl < 0 ? `Avoid trading around ${worst.hourLabel} (${formatCurrency(worst.avgPnl)} avg).` : ''
  }`.trim()
}

export function generateDayInsight(days: DayOfWeekStat[]): string | null {
  const active = days.filter((d) => d.count >= 3)
  if (active.length === 0) return null
  const losingDay = active.find((d) => d.winRate < 40 && d.totalPnl < 0)
  if (losingDay) {
    return `You consistently struggle on ${losingDay.day}s (${losingDay.winRate.toFixed(0)}% win rate). Skipping ${losingDay.day}s would have saved you ${formatCurrency(Math.abs(losingDay.totalPnl))}.`
  }
  const best = active.reduce((a, b) => (a.totalPnl > b.totalPnl ? a : b))
  if (best.totalPnl > 0) {
    return `${best.day} is your strongest day — ${formatCurrency(best.totalPnl)} total across ${best.count} trades.`
  }
  return null
}

export function generateDurationInsight(durations: DurationStat[]): string | null {
  const active = durations.filter((d) => d.count >= 2)
  if (active.length < 2) return null
  const best = active.reduce((a, b) => (a.avgPnl > b.avgPnl ? a : b))
  const worst = active.reduce((a, b) => (a.avgPnl < b.avgPnl ? a : b))
  if (best.label === worst.label) return null
  return `Your best trades last ${best.label} (${formatCurrency(best.avgPnl)} avg).${
    worst.avgPnl < 0 ? ` Trades in the ${worst.label} bucket average ${formatCurrency(worst.avgPnl)}.` : ''
  }`
}
