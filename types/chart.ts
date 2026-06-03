export type CumulativePnlPoint = {
  date: string
  timestamp: number
  cumPnl: number
  dailyPnl: number
}

export type DailyBarPoint = {
  date: string
  pnl: number
  trades: number
}

export type ScatterPoint = {
  hour: number
  minute: number
  pnl: number
  ticker: string
  id: string
  timeLabel: string
}

export type RadarDataPoint = {
  subject: string
  score: number
  fullMark: number
}

export type PriceCandle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type SetupStat = {
  setup: string
  trades: number
  wins: number
  winRate: number
  totalPnl: number
  avgPnl: number
}

export type TickerStat = {
  ticker: string
  trades: number
  wins: number
  winRate: number
  totalPnl: number
  avgPnl: number
}

// ── Advanced Analytics ───────────────────────────────────────────────────────

export type HourStat = {
  hour: number
  hourLabel: string
  avgPnl: number
  totalPnl: number
  count: number
}

export type DayOfWeekStat = {
  day: string
  shortDay: string
  count: number
  wins: number
  winRate: number
  avgPnl: number
  totalPnl: number
}

export type DurationStat = {
  label: string
  count: number
  avgPnl: number
  totalPnl: number
}

export type RollingExpectancyPoint = {
  date: string
  tradeIndex: number
  expectancy: number
}

export type StreakStats = {
  currentStreak: number
  currentStreakType: 'win' | 'loss' | 'none'
  bestWinStreak: number
  worstLossStreak: number
}
