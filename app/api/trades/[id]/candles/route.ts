/**
 * Trade Chart Candles Proxy API Route
 *
 * Fetches actual historical candle data from Yahoo Finance for a specific trade.
 * Cleans up and maps custom user ticker strings (e.g. SPX500.M) to Yahoo symbols.
 * Falls back to mock data generation if query fails or ticker is not found.
 *
 * @module app/api/trades/[id]/candles/route
 */

import { connectDB } from '@/app/api/lib/db'
import { TradeModel, type TradeDocument } from '@/app/api/lib/models/trade'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Maps common trading tickers/CFDs to standard Yahoo Finance symbols.
 * Forex CFD instruments (SPX500, NAS100, etc.) are mapped to their
 * corresponding futures contracts because they trade extended hours
 * like the broker's CFD pricing does.
 */
function mapSymbol(ticker: string): string {
  let symbol = ticker.toUpperCase().trim()
  
  // Strip common platform suffixes (e.g., .M for MT5 micro, .cfd, .FX, etc.)
  symbol = symbol.replace(/\.(M|CFD|US|FX)$/, '')

  // Futures contracts mapping
  if (symbol === 'MGC') return 'MGC=F'
  if (symbol === 'MNQ') return 'MNQ=F'
  if (symbol === 'MYM') return 'MYM=F'
  
  // Index CFDs → Spot indices (exact matching price levels for entry/exit lines)
  if (symbol === 'SPX500' || symbol === 'SPX' || symbol === 'S&P500' || symbol === 'US500') return '^GSPC'
  if (symbol === 'NAS100' || symbol === 'US100' || symbol === 'NAS' || symbol === 'USTEC') return '^NDX'
  if (symbol === 'US30' || symbol === 'DJ30' || symbol === 'DOW') return '^DJI'
  if (symbol === 'GER40' || symbol === 'GER30' || symbol === 'DE30' || symbol === 'DE40' || symbol === 'DAX') return '^GDAXI'
  if (symbol === 'UK100' || symbol === 'FTSE100') return '^FTSE'
  if (symbol === 'JP225' || symbol === 'JPN225' || symbol === 'NIKKEI') return 'NKD=F'
  if (symbol === 'AUS200' || symbol === 'AU200') return '^AXJO'
  
  // Forex (e.g. EURUSD or EUR/USD)
  const forexMatch = symbol.match(/^([A-Z]{3})\/?([A-Z]{3})$/)
  if (forexMatch) {
    return `${forexMatch[1]}${forexMatch[2]}=X`
  }
  
  // Commodities → Futures contracts (extended hours)
  if (symbol === 'XAUUSD' || symbol === 'GOLD') return 'GC=F'
  if (symbol === 'XAGUSD' || symbol === 'SILVER') return 'SI=F'
  if (symbol === 'XTIUSD' || symbol === 'USOIL' || symbol === 'OIL') return 'CL=F'
  if (symbol === 'XNGUSD' || symbol === 'NATGAS' || symbol === 'NGAS') return 'NG=F'
  
  // Crypto (e.g. BTC, BTCUSD, BTC/USD)
  const cryptoMatch = symbol.match(/^(BTC|ETH|LTC|SOL|XRP|ADA|DOT|DOGE|BNB)\/?(?:USD)?$/)
  if (cryptoMatch) {
    return `${cryptoMatch[1]}-USD`
  }
  
  return symbol
}

export async function GET(req: NextRequest, context: RouteContext) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Parse Params and Verify Authentication
    // ============================================================================
    const { id } = await context.params
    const userId = req.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!id) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 })
    }

    // ============================================================================
    // STEP 2: Fetch Trade from DB to calculate range
    // ============================================================================
    await connectDB()
    const trade = await TradeModel.findOne({ _id: id, userId }).lean<TradeDocument>()

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    // ============================================================================
    // STEP 3: Calculate optimal time window and interval
    // ============================================================================
    const entryMs = new Date(trade.entryDateTime).getTime()
    const exitMs = trade.exitDateTime ? new Date(trade.exitDateTime).getTime() : Date.now()
    const durationMs = exitMs - entryMs

    // 1. Allow override from query param, otherwise auto-detect based on trade duration
    const requestedInterval = new URL(req.url).searchParams.get('interval')
    const validIntervals = ['1m', '2m', '5m', '15m', '30m', '1h', '4h', '1d']
    let interval = requestedInterval && validIntervals.includes(requestedInterval)
      ? requestedInterval
      : null

    if (!interval) {
      const durationHrs = durationMs / (3600 * 1000)
      if (durationHrs > 120) {
        interval = '1d'
      } else if (durationHrs > 48) {
        interval = '4h'
      } else if (durationHrs > 12) {
        interval = '1h'
      } else if (durationHrs > 4) {
        interval = '15m'
      } else if (durationHrs > 1) {
        interval = '5m'
      } else {
        interval = '1m'
      }
    }

    // 2. Set expanded margins scaled by timeframe duration to maintain constant candle density
    const intervalDurations: Record<string, number> = {
      '1m': 1 * 60 * 1000,
      '2m': 2 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 3600 * 1000,
      '1d': 24 * 3600 * 1000,
    }
    const durationPerCandle = intervalDurations[interval] || 5 * 60 * 1000
    const closedHoursMultiplier = interval === '1d' ? 1.0 : 3.7 // account for market closed gaps in intraday

    let beforeMarginMs = Math.max(1500 * durationPerCandle * closedHoursMultiplier, durationMs * 15)
    let afterMarginMs = Math.max(1000 * durationPerCandle * closedHoursMultiplier, durationMs * 5)

    // 3. Cap margins to respect Yahoo Finance interval query limits
    if (interval === '1m') {
      // 1m data is capped at 7 days max. We use 6.5 days to be safe.
      const maxWindowMs = 6.5 * 24 * 60 * 60 * 1000
      const totalMarginSpace = Math.max(0, maxWindowMs - durationMs)
      beforeMarginMs = Math.min(beforeMarginMs, totalMarginSpace * 0.6)
      afterMarginMs = Math.min(afterMarginMs, totalMarginSpace * 0.4)
    } else if (['2m', '5m', '15m', '30m'].includes(interval)) {
      // Intraday data is capped at 60 days max. We use 58 days to be safe.
      const maxWindowMs = 58 * 24 * 60 * 60 * 1000
      const totalMarginSpace = Math.max(0, maxWindowMs - durationMs)
      beforeMarginMs = Math.min(beforeMarginMs, totalMarginSpace * 0.6)
      afterMarginMs = Math.min(afterMarginMs, totalMarginSpace * 0.4)
    }

    const period1 = Math.floor((entryMs - beforeMarginMs) / 1000)
    const period2 = Math.floor((exitMs + afterMarginMs) / 1000)

    // ============================================================================
    // STEP 4: Query Yahoo Finance API
    // ============================================================================
    const mappedSymbol = mapSymbol(trade.ticker)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${mappedSymbol}?period1=${period1}&period2=${period2}&interval=${interval}`
    
    const apiResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    if (!apiResponse.ok) {
      throw new Error(`Yahoo Finance API responded with status ${apiResponse.status}`)
    }

    const data = await apiResponse.json()
    const result = data.chart?.result?.[0]

    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      throw new Error('Incomplete data returned from Yahoo Finance')
    }

    // ============================================================================
    // STEP 5: Formulate candles output structure
    // ============================================================================
    const timestamps = result.timestamp
    const quote = result.indicators.quote[0]
    
    const candles = timestamps.map((time: number, idx: number) => {
      const open = quote.open[idx]
      const high = quote.high?.[idx] ?? open
      const low = quote.low?.[idx] ?? open
      const close = quote.close?.[idx] ?? open
      const volume = quote.volume?.[idx] ?? 0
      
      return {
        time,
        open: open ? Number(open) : null,
        high: high ? Number(high) : null,
        low: low ? Number(low) : null,
        close: close ? Number(close) : null,
        volume: volume ? Math.floor(volume) : 0,
      }
    }).filter((c: { open: number | null; high: number | null; low: number | null; close: number | null }) => c.open !== null && c.high !== null && c.low !== null && c.close !== null)

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Candles GET] Slow: ${duration}ms`)

    return NextResponse.json(candles)
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Candles GET] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to fetch real-world candles' }, { status: 500 })
  }
}
