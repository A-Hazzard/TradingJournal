import type { Trade } from '@/types/trade'

export type PropChallenge = {
  id: string
  name: string
  firm: string
  accountSize: number
  startingBalance: number
  profitTarget: number
  maxDailyLoss: number
  maxTotalDrawdown: number
  drawdownType: 'static' | 'trailing'
  startDate: string
  endDate: string | null
  phase: 'challenge' | 'verification' | 'funded'
  status: 'active' | 'passed' | 'failed'
  createdAt: string
  updatedAt: string
}

export type ChallengeProgress = {
  currentBalance: number
  totalPnl: number
  profitTargetProgress: number
  profitTargetMet: boolean
  todayPnl: number
  todayLoss: number
  dailyLimitUsedPercent: number
  dailyLimitBreached: boolean
  peakBalance: number
  currentDrawdown: number
  totalDrawdownUsedPercent: number
  totalDrawdownBreached: boolean
  computedStatus: 'safe' | 'warning' | 'danger' | 'passed' | 'failed'
}

export function computeChallengeProgress(challenge: PropChallenge, allTrades: Trade[]): ChallengeProgress {
  const challengeTrades = allTrades
    .filter(
      (t) =>
        t.status === 'CLOSED' &&
        new Date(t.entryDateTime) >= new Date(challenge.startDate)
    )
    .sort((a, b) => new Date(a.entryDateTime).getTime() - new Date(b.entryDateTime).getTime())

  const totalPnl = challengeTrades.reduce((s, t) => s + t.pnl, 0)
  const currentBalance = challenge.startingBalance + totalPnl

  // Profit target
  const profitTargetProgress = challenge.profitTarget > 0 ? (totalPnl / challenge.profitTarget) * 100 : 0
  const profitTargetMet = totalPnl >= challenge.profitTarget

  // Daily loss (today)
  const today = new Date().toISOString().slice(0, 10)
  const todayTrades = challengeTrades.filter((t) => t.entryDateTime.startsWith(today))
  const todayPnl = todayTrades.reduce((s, t) => s + t.pnl, 0)
  const todayLoss = Math.min(0, todayPnl)
  const dailyLimitUsedPercent = challenge.maxDailyLoss > 0 ? (Math.abs(todayLoss) / challenge.maxDailyLoss) * 100 : 0
  const dailyLimitBreached = Math.abs(todayLoss) >= challenge.maxDailyLoss

  // Drawdown
  let peakBalance = challenge.startingBalance
  if (challenge.drawdownType === 'trailing') {
    let running = challenge.startingBalance
    challengeTrades.forEach((t) => {
      running += t.pnl
      peakBalance = Math.max(peakBalance, running)
    })
  }
  const currentDrawdown = Math.max(0, peakBalance - currentBalance)
  const totalDrawdownUsedPercent = challenge.maxTotalDrawdown > 0 ? (currentDrawdown / challenge.maxTotalDrawdown) * 100 : 0
  const totalDrawdownBreached = currentDrawdown >= challenge.maxTotalDrawdown

  let computedStatus: ChallengeProgress['computedStatus']
  if (totalDrawdownBreached || dailyLimitBreached) computedStatus = 'failed'
  else if (profitTargetMet) computedStatus = 'passed'
  else if (dailyLimitUsedPercent > 75 || totalDrawdownUsedPercent > 75) computedStatus = 'warning'
  else computedStatus = 'safe'

  return {
    currentBalance: parseFloat(currentBalance.toFixed(2)),
    totalPnl: parseFloat(totalPnl.toFixed(2)),
    profitTargetProgress: parseFloat(profitTargetProgress.toFixed(1)),
    profitTargetMet,
    todayPnl: parseFloat(todayPnl.toFixed(2)),
    todayLoss: parseFloat(todayLoss.toFixed(2)),
    dailyLimitUsedPercent: parseFloat(dailyLimitUsedPercent.toFixed(1)),
    dailyLimitBreached,
    peakBalance: parseFloat(peakBalance.toFixed(2)),
    currentDrawdown: parseFloat(currentDrawdown.toFixed(2)),
    totalDrawdownUsedPercent: parseFloat(totalDrawdownUsedPercent.toFixed(1)),
    totalDrawdownBreached,
    computedStatus,
  }
}

export const CHALLENGE_TEMPLATES: Record<string, Omit<PropChallenge, 'id' | 'startDate' | 'endDate' | 'phase' | 'status' | 'createdAt' | 'updatedAt'>> = {
  ftmo_25k: { name: 'FTMO $25k Challenge', firm: 'ftmo', accountSize: 25000, startingBalance: 25000, profitTarget: 2500, maxDailyLoss: 1250, maxTotalDrawdown: 2500, drawdownType: 'static' },
  ftmo_100k: { name: 'FTMO $100k Challenge', firm: 'ftmo', accountSize: 100000, startingBalance: 100000, profitTarget: 10000, maxDailyLoss: 5000, maxTotalDrawdown: 10000, drawdownType: 'static' },
  apex_50k: { name: 'Apex $50k Eval', firm: 'apex', accountSize: 50000, startingBalance: 50000, profitTarget: 3000, maxDailyLoss: 1000, maxTotalDrawdown: 2500, drawdownType: 'trailing' },
  mff_50k: { name: 'MyFundedFutures $50k', firm: 'mff', accountSize: 50000, startingBalance: 50000, profitTarget: 3000, maxDailyLoss: 1000, maxTotalDrawdown: 2500, drawdownType: 'trailing' },
  topstep_50k: { name: 'Topstep $50k Combine', firm: 'topstep', accountSize: 50000, startingBalance: 50000, profitTarget: 3000, maxDailyLoss: 2000, maxTotalDrawdown: 3000, drawdownType: 'trailing' },
}
