import type { PriceCandle } from '@/types/chart'
import type { Trade } from '@/types/trade'

function seededRandom(seed: string, index: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  h = (Math.imul(31, h) + index) | 0
  h = h ^ (h >>> 16)
  h = Math.imul(h, 0x45d9f3b)
  h = h ^ (h >>> 16)
  return (h >>> 0) / 0xffffffff
}

export function generatePriceCandlesForTrade(trade: Trade): PriceCandle[] {
  const sessionDate = trade.entryDateTime.slice(0, 10)
  // 9:30 AM ET = 13:30 UTC
  const sessionStartMs = new Date(`${sessionDate}T13:30:00.000Z`).getTime()
  const totalMinutes = 390 // 9:30–16:00

  const entryMs = new Date(trade.entryDateTime).getTime()
  const exitMs = trade.exitDateTime ? new Date(trade.exitDateTime).getTime() : entryMs + 60 * 60000

  const entryMinute = Math.max(0, Math.floor((entryMs - sessionStartMs) / 60000))
  const exitMinute = Math.min(totalMinutes - 1, Math.floor((exitMs - sessionStartMs) / 60000))

  const basePrice = trade.entryPrice * (1 + (seededRandom(trade.id, 0) - 0.5) * 0.008)
  const targetPrice = trade.exitPrice ?? trade.entryPrice

  const candles: PriceCandle[] = []

  for (let i = 0; i < totalMinutes; i++) {
    const candleTimeMs = sessionStartMs + i * 60000
    const candleTimeSec = Math.floor(candleTimeMs / 1000)

    // Determine where we are in the trade lifecycle
    let driftFactor = 0
    if (i >= entryMinute && i <= exitMinute && exitMinute > entryMinute) {
      const progress = (i - entryMinute) / (exitMinute - entryMinute)
      driftFactor = progress
    }

    const priceDelta = targetPrice - trade.entryPrice
    const driftedMid =
      i < entryMinute
        ? basePrice + (seededRandom(trade.id, i) - 0.5) * basePrice * 0.004
        : i <= exitMinute
        ? trade.entryPrice + priceDelta * driftFactor + (seededRandom(trade.id, i) - 0.5) * basePrice * 0.003
        : targetPrice + (seededRandom(trade.id, i + 1000) - 0.5) * basePrice * 0.005

    const volatility = basePrice * 0.002
    const r1 = seededRandom(trade.id, i * 4 + 1)
    const r2 = seededRandom(trade.id, i * 4 + 2)
    const r3 = seededRandom(trade.id, i * 4 + 3)
    const r4 = seededRandom(trade.id, i * 4 + 4)

    const open = parseFloat((driftedMid + (r1 - 0.5) * volatility).toFixed(2))
    const close = parseFloat((driftedMid + (r2 - 0.5) * volatility).toFixed(2))
    const wickExtra = volatility * 0.5
    const high = parseFloat((Math.max(open, close) + r3 * wickExtra).toFixed(2))
    const low = parseFloat((Math.min(open, close) - r4 * wickExtra).toFixed(2))

    // Pin entry/exit candle prices to touch the actual levels
    let finalOpen = open, finalClose = close, finalHigh = high, finalLow = low
    if (i === entryMinute) {
      finalLow = Math.min(low, trade.entryPrice - 0.01)
      finalHigh = Math.max(high, trade.entryPrice + 0.01)
    }
    if (i === exitMinute && trade.exitPrice) {
      finalLow = Math.min(finalLow, trade.exitPrice - 0.01)
      finalHigh = Math.max(finalHigh, trade.exitPrice + 0.01)
    }

    const volume = Math.floor(50000 + seededRandom(trade.id, i + 5000) * 200000)

    candles.push({
      time: candleTimeSec,
      open: finalOpen,
      high: finalHigh,
      low: finalLow,
      close: finalClose,
      volume,
    })
  }

  return candles
}
