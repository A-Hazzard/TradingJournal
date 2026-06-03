import { describe, it, expect } from 'vitest'
import { computePnl, computePnlPercent, computeRMultiple, computeKpis } from './calculations'
import type { Trade } from '@/types/trade'

describe('Calculations Library', () => {
  describe('computePnl', () => {
    it('calculates long trade P&L correctly without fees', () => {
      const pnl = computePnl('LONG', 100, 110, 10)
      expect(pnl).toBe(100) // (110 - 100) * 10 = 100
    })

    it('calculates long trade P&L correctly with commissions and fees', () => {
      const pnl = computePnl('LONG', 100, 110, 10, 5, 2.5)
      expect(pnl).toBe(92.5) // 100 - 5 - 2.5 = 92.5
    })

    it('calculates short trade P&L correctly', () => {
      const pnl = computePnl('SHORT', 100, 90, 10, 5, 2.5)
      expect(pnl).toBe(92.5) // (100 - 90) * 10 - 5 - 2.5 = 92.5
    })

    it('calculates losing long trade P&L correctly', () => {
      const pnl = computePnl('LONG', 100, 90, 10)
      expect(pnl).toBe(-100) // (90 - 100) * 10 = -100
    })
  })

  describe('computePnlPercent', () => {
    it('calculates long trade return percentage correctly', () => {
      const percent = computePnlPercent('LONG', 100, 120)
      expect(percent).toBe(20) // ((120 - 100) / 100) * 100 = 20
    })

    it('calculates short trade return percentage correctly', () => {
      const percent = computePnlPercent('SHORT', 100, 80)
      expect(percent).toBe(20) // ((100 - 80) / 100) * 100 = 20
    })
  })

  describe('computeRMultiple', () => {
    it('calculates R-multiple for long winner correctly', () => {
      const r = computeRMultiple('LONG', 100, 110, 95)
      expect(r).toBe(2) // Reward = 10, Risk = 5, R = 10 / 5 = 2
    })

    it('calculates R-multiple for long loser correctly', () => {
      const r = computeRMultiple('LONG', 100, 95, 95)
      expect(r).toBe(-1) // Reward = -5, Risk = 5, R = -5 / 5 = -1
    })

    it('returns null if stop loss is not provided', () => {
      const r = computeRMultiple('LONG', 100, 110, null)
      expect(r).toBeNull()
    })

    it('returns null if stop loss equals entry price', () => {
      const r = computeRMultiple('LONG', 100, 110, 100)
      expect(r).toBeNull()
    })
  })

  describe('computeKpis', () => {
    const mockTrades: Trade[] = [
      {
        id: '1',
        ticker: 'AAPL',
        direction: 'LONG',
        status: 'CLOSED',
        entryDateTime: '2026-06-01T10:00:00Z',
        entryPrice: 100,
        exitDateTime: '2026-06-01T11:00:00Z',
        exitPrice: 110,
        quantity: 10,
        commission: 0,
        fees: 0,
        pnl: 100,
        pnlPercent: 10,
        rMultiple: 2,
        holdingDurationMs: 3600000,
        tags: [],
        setup: 'Bull Flag',
      },
      {
        id: '2',
        ticker: 'TSLA',
        direction: 'SHORT',
        status: 'CLOSED',
        entryDateTime: '2026-06-02T10:00:00Z',
        entryPrice: 200,
        exitDateTime: '2026-06-02T10:30:00Z',
        exitPrice: 205,
        quantity: 10,
        commission: 0,
        fees: 0,
        pnl: -50,
        pnlPercent: -2.5,
        rMultiple: -1,
        holdingDurationMs: 1800000,
        tags: [],
        setup: 'Bull Flag',
      },
    ]

    it('calculates summary KPIs correctly', () => {
      const kpis = computeKpis(mockTrades)
      expect(kpis.totalTrades).toBe(2)
      expect(kpis.totalWins).toBe(1)
      expect(kpis.totalLosses).toBe(1)
      expect(kpis.netPnl).toBe(50)
      expect(kpis.winRate).toBe(50)
      expect(kpis.profitFactor).toBe(2) // 100 / 50 = 2
      expect(kpis.avgWin).toBe(100)
      expect(kpis.avgLoss).toBe(-50)
      expect(kpis.avgRMultiple).toBe(0.5) // (2 + -1) / 2 = 0.5
      expect(kpis.avgHoldingTimeMs).toBe(2700000) // (3600000 + 1800000) / 2 = 2700000
    })

    it('returns empty KPIs for empty list of trades', () => {
      const kpis = computeKpis([])
      expect(kpis.totalTrades).toBe(0)
      expect(kpis.netPnl).toBe(0)
      expect(kpis.winRate).toBe(0)
    })
  })
})
