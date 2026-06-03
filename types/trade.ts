export type Direction = 'LONG' | 'SHORT'
export type TradeStatus = 'OPEN' | 'CLOSED'
export type AssetClass = 'forex' | 'indices' | 'stocks' | 'crypto' | 'commodities' | 'futures'

export type EmotionTag =
  | 'confident' | 'focused' | 'neutral' | 'anxious'
  | 'frustrated' | 'fomo' | 'revenge' | 'bored' | 'greedy'

export type ProcessGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export type MistakeType =
  | 'early_exit' | 'late_entry' | 'oversized'
  | 'no_stop' | 'broke_rules' | 'chased'

export type Trade = {
  id: string
  ticker: string
  assetClass: AssetClass
  direction: Direction
  status: TradeStatus
  entryDateTime: string
  entryPrice: number
  exitDateTime: string | null
  exitPrice: number | null
  quantity: number
  stopLoss?: number | null
  takeProfit?: number | null
  commission: number
  fees: number
  tags: string[]
  setup: string
  journalNotes: string
  screenshot?: string
  pnl: number
  pnlPercent: number
  rMultiple?: number | null
  holdingDurationMs?: number
  // ── Psychology fields ──────────────────────────────
  emotionTag?: EmotionTag | null
  processGrade?: ProcessGrade | null
  mistakeType?: MistakeType | null
}

export type TradeFilters = {
  dateRange: { start: string | null; end: string | null }
  tickers: string[]
  directions: Direction[]
  tags: string[]
  minPnl: number | null
  maxPnl: number | null
  setup: string | null
  status: TradeStatus | null
}

export type KpiSummary = {
  netPnl: number
  winRate: number
  profitFactor: number
  dayWinRate: number
  avgWin: number
  avgLoss: number
  totalTrades: number
  totalWins: number
  totalLosses: number
  largestWin: number
  largestLoss: number
  avgRMultiple: number
  zellaScore: number
  totalCommissions: number
  avgHoldingTimeMs: number
}
