/**
 * Risk Today API Route
 *
 * Computes today's risk context — daily P&L vs limit, drawdown from peak balance.
 *
 * @module app/api/risk/today/route
 */

import { connectDB } from '@/app/api/lib/db'
import { RiskSettingsModel, type RiskSettingsDocument } from '@/app/api/lib/models/riskSettings'
import { TradeModel, type TradeDocument } from '@/app/api/lib/models/trade'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Resolve user
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ============================================================================
    // STEP 2: Fetch settings + closed trades
    // ============================================================================
    await connectDB()
    let settings = await RiskSettingsModel.findOne({ userId }).lean<RiskSettingsDocument>()
    if (!settings) {
      const created = await RiskSettingsModel.create({ userId })
      settings = created.toObject() as unknown as RiskSettingsDocument
    }

    const trades = await TradeModel.find({ userId, status: 'CLOSED' })
      .sort({ entryDateTime: 1 })
      .lean<TradeDocument[]>()

    // ============================================================================
    // STEP 3: Compute today's P&L
    // ============================================================================
    const today = new Date().toISOString().slice(0, 10)
    const todayTrades = trades.filter((t) => (t.entryDateTime as string).startsWith(today))
    const todayPnl = todayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
    const todayLoss = Math.min(0, todayPnl)
    const dailyLimitUsedPercent =
      settings.dailyLossLimit > 0 ? (Math.abs(todayLoss) / settings.dailyLossLimit) * 100 : 0
    const isLimitBreached = Math.abs(todayLoss) >= settings.dailyLossLimit

    // ============================================================================
    // STEP 4: Compute balance + drawdown from peak
    // ============================================================================
    const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0)
    const currentBalance = settings.startingBalance + totalPnl

    let running = settings.startingBalance
    let peakBalance = settings.startingBalance
    trades.forEach((t) => {
      running += t.pnl ?? 0
      peakBalance = Math.max(peakBalance, running)
    })
    const currentDrawdown = Math.max(0, peakBalance - currentBalance)
    const currentDrawdownPercent = peakBalance > 0 ? (currentDrawdown / peakBalance) * 100 : 0

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Risk Today GET] Slow: ${duration}ms`)

    return NextResponse.json({
      todayPnl: parseFloat(todayPnl.toFixed(2)),
      todayTrades: todayTrades.length,
      dailyLimitUsedPercent: parseFloat(dailyLimitUsedPercent.toFixed(1)),
      isLimitBreached,
      currentBalance: parseFloat(currentBalance.toFixed(2)),
      peakBalance: parseFloat(peakBalance.toFixed(2)),
      currentDrawdown: parseFloat(currentDrawdown.toFixed(2)),
      currentDrawdownPercent: parseFloat(currentDrawdownPercent.toFixed(2)),
      startingBalance: settings.startingBalance,
      dailyLossLimit: settings.dailyLossLimit,
    })
  } catch (e) {
    console.error('[Risk Today GET] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to compute risk context' }, { status: 500 })
  }
}
