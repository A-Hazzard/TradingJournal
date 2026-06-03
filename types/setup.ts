export type Setup = {
  id: string
  name: string
  description: string
  entryRules: string
  exitRules: string
  idealConditions: string
  timeframes: string[]
  assetClasses: string[]
  tags: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

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
