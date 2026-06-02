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
