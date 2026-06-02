import type { Trade, KpiSummary, TradeFilters } from '@/types/trade'
import type {
  CumulativePnlPoint,
  DailyBarPoint,
  ScatterPoint,
  RadarDataPoint,
  SetupStat,
  TickerStat,
} from '@/types/chart'
import type { DailyStats } from '@/types/journal'

export function computePnl(
  direction: 'LONG' | 'SHORT',
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  commission = 0,
  fees = 0
): number {
  const gross =
    direction === 'LONG'
      ? (exitPrice - entryPrice) * quantity
      : (entryPrice - exitPrice) * quantity
  return gross - commission - fees
}

export function computePnlPercent(
  direction: 'LONG' | 'SHORT',
  entryPrice: number,
  exitPrice: number
): number {
  return direction === 'LONG'
    ? ((exitPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - exitPrice) / entryPrice) * 100
}

export function computeRMultiple(
  direction: 'LONG' | 'SHORT',
  entryPrice: number,
  exitPrice: number,
  stopLoss: number | null | undefined
): number | null {
  if (stopLoss === undefined || stopLoss === null || stopLoss === entryPrice) return null
  const risk = direction === 'LONG' ? entryPrice - stopLoss : stopLoss - entryPrice
  if (risk <= 0) return null
  const reward = direction === 'LONG' ? exitPrice - entryPrice : entryPrice - exitPrice
  return parseFloat((reward / risk).toFixed(2))
}

export function computeKpis(trades: Trade[]): KpiSummary {
  const closed = trades.filter((t) => t.status === 'CLOSED' && t.exitPrice !== null)

  if (closed.length === 0) {
    return {
      netPnl: 0, winRate: 0, profitFactor: 0, dayWinRate: 0,
      avgWin: 0, avgLoss: 0, totalTrades: 0, totalWins: 0,
      totalLosses: 0, largestWin: 0, largestLoss: 0,
      avgRMultiple: 0, zellaScore: 0, totalCommissions: 0, avgHoldingTimeMs: 0,
    }
  }

  const wins = closed.filter((t) => t.pnl > 0)
  const losses = closed.filter((t) => t.pnl <= 0)

  const netPnl = closed.reduce((s, t) => s + t.pnl, 0)
  const winRate = (wins.length / closed.length) * 100

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
  const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss

  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0
  const avgLoss = losses.length > 0 ? -(grossLoss / losses.length) : 0

  const largestWin = wins.length > 0 ? Math.max(...wins.map((t) => t.pnl)) : 0
  const largestLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.pnl)) : 0

  // Day win rate
  const byDate: Record<string, number> = {}
  closed.forEach((t) => {
    const d = t.entryDateTime.slice(0, 10)
    byDate[d] = (byDate[d] ?? 0) + t.pnl
  })
  const days = Object.values(byDate)
  const dayWinRate = days.length > 0 ? (days.filter((p) => p > 0).length / days.length) * 100 : 0

  const rMultiples = closed.filter((t) => t.rMultiple !== undefined && t.rMultiple !== null).map((t) => t.rMultiple!)
  const avgRMultiple = rMultiples.length > 0 ? rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length : 0

  const totalCommissions = trades.reduce((s, t) => s + t.commission + t.fees, 0)

  const durations = closed.filter((t) => t.holdingDurationMs !== undefined).map((t) => t.holdingDurationMs!)
  const avgHoldingTimeMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

  const zellaScore = computeZellaScore({ winRate, profitFactor, avgRMultiple, dayWinRate, closed })

  return {
    netPnl, winRate, profitFactor, dayWinRate,
    avgWin, avgLoss,
    totalTrades: closed.length, totalWins: wins.length, totalLosses: losses.length,
    largestWin, largestLoss, avgRMultiple, zellaScore,
    totalCommissions, avgHoldingTimeMs,
  }
}

function computeZellaScore({
  winRate, profitFactor, avgRMultiple, dayWinRate, closed,
}: {
  winRate: number
  profitFactor: number
  avgRMultiple: number
  dayWinRate: number
  closed: Trade[]
}): number {
  // Win rate: 0–100% → 0–25 pts
  const wrScore = Math.min(winRate / 100, 1) * 25

  // Profit factor: 1–3+ → 0–25 pts (PF < 1 = 0, PF >= 3 = 25)
  const pfScore = Math.min(Math.max((profitFactor - 1) / 2, 0), 1) * 25

  // Avg R-multiple: 0–3 → 0–20 pts
  const rScore = Math.min(Math.max(avgRMultiple / 3, 0), 1) * 20

  // Consistency (day win rate): 0–100% → 0–10 pts
  const dScore = Math.min(dayWinRate / 100, 1) * 10

  // Frequency bonus: more trades up to 50 → 0–20 pts
  const freqScore = Math.min(closed.length / 50, 1) * 20

  return Math.round(wrScore + pfScore + rScore + dScore + freqScore)
}

export function buildCumulativePnlSeries(trades: Trade[]): CumulativePnlPoint[] {
  const closed = trades.filter((t) => t.status === 'CLOSED')
  const sorted = [...closed].sort(
    (a, b) => new Date(a.entryDateTime).getTime() - new Date(b.entryDateTime).getTime()
  )

  const byDate: Record<string, number> = {}
  sorted.forEach((t) => {
    const d = t.entryDateTime.slice(0, 10)
    byDate[d] = (byDate[d] ?? 0) + t.pnl
  })

  let cum = 0
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dailyPnl]) => {
      cum += dailyPnl
      return {
        date: formatChartDate(date),
        timestamp: new Date(date).getTime(),
        cumPnl: parseFloat(cum.toFixed(2)),
        dailyPnl: parseFloat(dailyPnl.toFixed(2)),
      }
    })
}

export function buildDailyBarSeries(trades: Trade[]): DailyBarPoint[] {
  const closed = trades.filter((t) => t.status === 'CLOSED')
  const byDate: Record<string, { pnl: number; trades: number }> = {}
  closed.forEach((t) => {
    const d = t.entryDateTime.slice(0, 10)
    if (!byDate[d]) byDate[d] = { pnl: 0, trades: 0 }
    byDate[d].pnl += t.pnl
    byDate[d].trades += 1
  })
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date: formatChartDate(date),
      pnl: parseFloat(v.pnl.toFixed(2)),
      trades: v.trades,
    }))
}

export function buildScatterSeries(trades: Trade[]): ScatterPoint[] {
  return trades
    .filter((t) => t.status === 'CLOSED')
    .map((t) => {
      const dt = new Date(t.entryDateTime)
      const hour = dt.getHours()
      const minute = dt.getMinutes()
      return {
        hour,
        minute,
        pnl: parseFloat(t.pnl.toFixed(2)),
        ticker: t.ticker,
        id: t.id,
        timeLabel: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      }
    })
}

export function buildRadarData(kpis: KpiSummary): RadarDataPoint[] {
  const pf = Math.min((kpis.profitFactor / 3) * 100, 100)
  const r = Math.min(Math.max((kpis.avgRMultiple / 3) * 100, 0), 100)
  return [
    { subject: 'Win Rate', score: Math.round(kpis.winRate), fullMark: 100 },
    { subject: 'Profit Factor', score: Math.round(pf), fullMark: 100 },
    { subject: 'Day Win %', score: Math.round(kpis.dayWinRate), fullMark: 100 },
    { subject: 'Avg R', score: Math.round(r), fullMark: 100 },
    { subject: 'Consistency', score: Math.round(kpis.dayWinRate * 0.9), fullMark: 100 },
    { subject: 'Risk Mgmt', score: Math.min(Math.round(kpis.profitFactor * 25), 100), fullMark: 100 },
  ]
}

export function filterTrades(trades: Trade[], filters: TradeFilters): Trade[] {
  return trades.filter((t) => {
    if (filters.status && t.status !== filters.status) return false
    if (filters.tickers.length > 0 && !filters.tickers.includes(t.ticker)) return false
    if (filters.directions.length > 0 && !filters.directions.includes(t.direction)) return false
    if (filters.setup && t.setup !== filters.setup) return false
    if (filters.tags.length > 0 && !filters.tags.some((tag) => t.tags.includes(tag))) return false
    if (filters.minPnl !== null && t.pnl < filters.minPnl) return false
    if (filters.maxPnl !== null && t.pnl > filters.maxPnl) return false
    if (filters.dateRange.start) {
      if (new Date(t.entryDateTime) < new Date(filters.dateRange.start)) return false
    }
    if (filters.dateRange.end) {
      if (new Date(t.entryDateTime) > new Date(filters.dateRange.end)) return false
    }
    return true
  })
}

export function groupTradesByDate(trades: Trade[]): Record<string, Trade[]> {
  const map: Record<string, Trade[]> = {}
  trades.forEach((t) => {
    const d = t.entryDateTime.slice(0, 10)
    if (!map[d]) map[d] = []
    map[d].push(t)
  })
  return map
}

export function getMonthlyCalendarData(
  trades: Trade[],
  year: number,
  month: number
): DailyStats[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const result: DailyStats[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayTrades = trades.filter(
      (t) => t.entryDateTime.slice(0, 10) === dateStr && t.status === 'CLOSED'
    )
    const pnl = dayTrades.reduce((s, t) => s + t.pnl, 0)
    const wins = dayTrades.filter((t) => t.pnl > 0).length
    const losses = dayTrades.filter((t) => t.pnl <= 0).length
    result.push({
      date: dateStr,
      trades: dayTrades.length,
      pnl: parseFloat(pnl.toFixed(2)),
      wins,
      losses,
      winRate: dayTrades.length > 0 ? (wins / dayTrades.length) * 100 : 0,
    })
  }
  return result
}

export function buildSetupStats(trades: Trade[]): SetupStat[] {
  const closed = trades.filter((t) => t.status === 'CLOSED')
  const map: Record<string, { trades: Trade[] }> = {}
  closed.forEach((t) => {
    if (!t.setup) return
    if (!map[t.setup]) map[t.setup] = { trades: [] }
    map[t.setup].trades.push(t)
  })
  return Object.entries(map).map(([setup, { trades: ts }]) => {
    const wins = ts.filter((t) => t.pnl > 0).length
    const totalPnl = ts.reduce((s, t) => s + t.pnl, 0)
    return {
      setup,
      trades: ts.length,
      wins,
      winRate: (wins / ts.length) * 100,
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      avgPnl: parseFloat((totalPnl / ts.length).toFixed(2)),
    }
  }).sort((a, b) => b.totalPnl - a.totalPnl)
}

export function buildTickerStats(trades: Trade[]): TickerStat[] {
  const closed = trades.filter((t) => t.status === 'CLOSED')
  const map: Record<string, Trade[]> = {}
  closed.forEach((t) => {
    if (!map[t.ticker]) map[t.ticker] = []
    map[t.ticker].push(t)
  })
  return Object.entries(map).map(([ticker, ts]) => {
    const wins = ts.filter((t) => t.pnl > 0).length
    const totalPnl = ts.reduce((s, t) => s + t.pnl, 0)
    return {
      ticker,
      trades: ts.length,
      wins,
      winRate: (wins / ts.length) * 100,
      totalPnl: parseFloat(totalPnl.toFixed(2)),
      avgPnl: parseFloat((totalPnl / ts.length).toFixed(2)),
    }
  }).sort((a, b) => b.totalPnl - a.totalPnl)
}

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
