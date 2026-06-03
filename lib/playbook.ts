import type { Trade } from '@/types/trade'

export type SetupGrade = 'A' | 'B' | 'C' | 'D' | 'F' | 'N/A'

export type SetupPerformance = {
  totalTrades: number
  wins: number
  losses: number
  winRate: number
  totalPnl: number
  avgPnl: number
  avgRMultiple: number | null
  expectancy: number
  profitFactor: number
  grade: SetupGrade
}

export function computeExpectancy(trades: Trade[]): number {
  if (trades.length === 0) return 0
  return trades.reduce((s, t) => s + t.pnl, 0) / trades.length
}

export function gradeSetup(expectancy: number, sampleSize: number): SetupGrade {
  if (sampleSize < 10) return 'N/A'
  if (expectancy > 150) return 'A'
  if (expectancy > 75) return 'B'
  if (expectancy > 0) return 'C'
  if (expectancy > -50) return 'D'
  return 'F'
}

export function computeSetupPerformance(trades: Trade[]): SetupPerformance {
  const closed = trades.filter((t) => t.status === 'CLOSED')
  if (closed.length === 0) {
    return {
      totalTrades: 0, wins: 0, losses: 0, winRate: 0, totalPnl: 0,
      avgPnl: 0, avgRMultiple: null, expectancy: 0, profitFactor: 0, grade: 'N/A',
    }
  }

  const wins = closed.filter((t) => t.pnl > 0)
  const losses = closed.filter((t) => t.pnl <= 0)
  const totalPnl = closed.reduce((s, t) => s + t.pnl, 0)
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
  const rMultiples = closed.filter((t) => t.rMultiple != null).map((t) => t.rMultiple as number)
  const expectancy = computeExpectancy(closed)

  return {
    totalTrades: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: (wins.length / closed.length) * 100,
    totalPnl: parseFloat(totalPnl.toFixed(2)),
    avgPnl: parseFloat((totalPnl / closed.length).toFixed(2)),
    avgRMultiple: rMultiples.length ? parseFloat((rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length).toFixed(2)) : null,
    expectancy: parseFloat(expectancy.toFixed(2)),
    profitFactor: grossLoss === 0 ? grossProfit : parseFloat((grossProfit / grossLoss).toFixed(2)),
    grade: gradeSetup(expectancy, closed.length),
  }
}
