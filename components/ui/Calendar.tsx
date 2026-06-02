'use client'

import { cn, formatCurrency } from '@/lib/formatters'
import type { DailyStats } from '@/types/journal'

type Props = {
  year: number
  month: number
  stats: DailyStats[]
  onDayClick?: (date: string) => void
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getCellClass(pnl: number, hasTrades: boolean): string {
  if (!hasTrades) return 'bg-surface-alt/50'
  if (pnl >= 500) return 'bg-profit/80'
  if (pnl > 0) return 'bg-profit/30'
  if (pnl < -500) return 'bg-loss/70'
  if (pnl < 0) return 'bg-loss/25'
  return 'bg-surface-alt'
}

export function Calendar({ year, month, stats, onDayClick }: Props) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const statsByDate = Object.fromEntries(stats.map((s) => [s.date, s]))
  const today = new Date().toISOString().slice(0, 10)

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-text-muted py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const stat = statsByDate[dateStr]
          const hasTrades = (stat?.trades ?? 0) > 0
          const isToday = dateStr === today

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick?.(dateStr)}
              className={cn(
                'aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all hover:ring-1 hover:ring-accent/50',
                getCellClass(stat?.pnl ?? 0, hasTrades),
                isToday && 'ring-1 ring-accent'
              )}
            >
              <span className={cn('text-xs font-medium', isToday ? 'text-accent' : 'text-text-secondary')}>{day}</span>
              {hasTrades && (
                <span className={cn('text-[9px] font-semibold tabular-nums', (stat?.pnl ?? 0) >= 0 ? 'text-profit' : 'text-loss')}>
                  {formatCurrency(stat.pnl, 0)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
