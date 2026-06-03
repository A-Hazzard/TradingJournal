/**
 * Trades API Route
 *
 * Handles trade record management for the TradeJournal platform.
 * It supports:
 * - List all trades with optional filters (ticker, direction, status, dateRange)
 * - Create a new trade
 *
 * @module app/api/trades/route
 */

import { connectDB } from '@/app/api/lib/db'
import { TradeModel, type TradeDocument } from '@/app/api/lib/models/trade'
import { computePnl, computePnlPercent, computeRMultiple } from '@/lib/calculations'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET handler — list all trades with optional filters
 *
 * Flow:
 * 1. Parse filter parameters from query string
 * 2. Connect to database
 * 3. Build filter query
 * 4. Fetch trades sorted by entry date descending
 * 5. Return JSON response
 *
 * @param {NextRequest} req - Incoming request with optional query params:
 *   ticker, direction, status, dateStart, dateEnd
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Parse filter parameters from query string
    // ============================================================================
    const { searchParams } = new URL(req.url)
    const ticker = searchParams.get('ticker')
    const direction = searchParams.get('direction')
    const status = searchParams.get('status')
    const dateStart = searchParams.get('dateStart')
    const dateEnd = searchParams.get('dateEnd')
    const userId = req.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 3: Build filter query
    // ============================================================================
    const filter: Record<string, unknown> = { userId }
    if (ticker) filter.ticker = ticker.toUpperCase()
    if (direction === 'LONG' || direction === 'SHORT') filter.direction = direction
    if (status === 'OPEN' || status === 'CLOSED') filter.status = status
    if (dateStart || dateEnd) {
      const dateFilter: Record<string, string> = {}
      if (dateStart) dateFilter.$gte = dateStart
      if (dateEnd) dateFilter.$lte = dateEnd
      filter.entryDateTime = dateFilter
    }

    // ============================================================================
    // STEP 4: Fetch trades sorted by entry date descending
    // ============================================================================
    const trades = await TradeModel.find(filter)
      .sort({ entryDateTime: -1 })
      .lean<TradeDocument[]>()

    // ============================================================================
    // STEP 5: Return JSON response
    // ============================================================================
    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Trades GET] Slow query: ${duration}ms`)

    return NextResponse.json(
      trades.map((trade) => ({ ...trade, id: trade._id?.toString() ?? '' }))
    )
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Trades GET] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
  }
}

/**
 * POST handler — create a new trade
 *
 * Flow:
 * 1. Parse and validate request body
 * 2. Connect to database
 * 3. Compute P&L if trade is closed
 * 4. Create trade document
 * 5. Return created trade
 *
 * @body {object} Trade fields — ticker, direction, entryDateTime, entryPrice, quantity, etc.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Parse and validate request body
    // ============================================================================
    const rawBody: Partial<TradeDocument> = await req.json()
    const userId = req.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Whitelist user-submitted fields to prevent mass assignment
    const body = {
      ticker: rawBody.ticker,
      assetClass: rawBody.assetClass,
      direction: rawBody.direction,
      status: rawBody.status,
      entryDateTime: rawBody.entryDateTime,
      entryPrice: rawBody.entryPrice,
      exitDateTime: rawBody.exitDateTime,
      exitPrice: rawBody.exitPrice,
      quantity: rawBody.quantity,
      stopLoss: rawBody.stopLoss,
      takeProfit: rawBody.takeProfit,
      commission: rawBody.commission,
      fees: rawBody.fees,
      tags: rawBody.tags,
      setup: rawBody.setup,
      journalNotes: rawBody.journalNotes,
      screenshot: rawBody.screenshot,
      emotionTag: rawBody.emotionTag,
      processGrade: rawBody.processGrade,
      mistakeType: rawBody.mistakeType,
    }

    if (!body.ticker || !body.direction || !body.entryDateTime || !body.entryPrice || !body.quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: ticker, direction, entryDateTime, entryPrice, quantity' },
        { status: 400 }
      )
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 3: Compute P&L if trade is closed
    // ============================================================================
    let pnl = 0
    let pnlPercent = 0
    let holdingDurationMs: number | null = null
    let rMultiple: number | null = null

    if (body.status === 'CLOSED' && body.exitPrice && body.exitDateTime) {
      pnl = computePnl(
        body.direction,
        body.entryPrice,
        body.exitPrice,
        body.quantity,
        body.commission ?? 0,
        body.fees ?? 0
      )
      pnlPercent = computePnlPercent(body.direction, body.entryPrice, body.exitPrice)
      holdingDurationMs = new Date(body.exitDateTime).getTime() - new Date(body.entryDateTime).getTime()
      rMultiple = computeRMultiple(body.direction, body.entryPrice, body.exitPrice, body.stopLoss)
    }

    // ============================================================================
    // STEP 4: Create trade document
    // ============================================================================
    const trade = await TradeModel.create({
      ...body,
      userId,
      ticker: body.ticker.toUpperCase(),
      pnl,
      pnlPercent,
      holdingDurationMs,
      rMultiple,
    })

    // ============================================================================
    // STEP 5: Return created trade
    // ============================================================================
    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Trades POST] Slow: ${duration}ms`)

    const created = await TradeModel.findOne({ _id: trade._id, userId }).lean<TradeDocument>()
    return NextResponse.json(
      { ...created, id: created?._id?.toString() ?? '' },
      { status: 201 }
    )
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Trades POST] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 })
  }
}
