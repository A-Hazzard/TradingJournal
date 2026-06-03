/**
 * Trade Detail API Route
 *
 * Handles individual trade operations for the TradeJournal platform.
 * It supports:
 * - Fetch a single trade by ID
 * - Update trade fields (partial update via PATCH)
 * - Delete a trade
 *
 * @module app/api/trades/[id]/route
 */

import { connectDB } from '@/app/api/lib/db'
import { TradeModel, type TradeDocument } from '@/app/api/lib/models/trade'
import { computePnl, computePnlPercent, computeRMultiple } from '@/lib/calculations'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET handler — fetch a single trade by ID
 *
 * Flow:
 * 1. Extract trade ID from route params
 * 2. Connect to database
 * 3. Fetch trade document
 * 4. Return trade or 404
 *
 * @param {NextRequest} req - Incoming request
 * @param {RouteContext} context - Route context containing trade ID
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Extract trade ID from route params
    // ============================================================================
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 })
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 3: Fetch trade document
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const trade = await TradeModel.findOne({ _id: id, userId }).lean<TradeDocument>()

    // ============================================================================
    // STEP 4: Return trade or 404
    // ============================================================================
    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Trade GET] Slow: ${duration}ms`)

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }
    return NextResponse.json({ ...trade, id: trade._id?.toString() ?? '' })
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Trade GET] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to fetch trade' }, { status: 500 })
  }
}

/**
 * PATCH handler — update trade fields
 *
 * Flow:
 * 1. Extract trade ID from route params
 * 2. Parse request body
 * 3. Connect to database
 * 4. Recompute P&L if exit fields changed
 * 5. Apply partial update
 * 6. Return updated trade
 *
 * @param {NextRequest} req - Incoming request with partial Trade fields in body
 * @param {RouteContext} context - Route context containing trade ID
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Extract trade ID from route params
    // ============================================================================
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 })
    }

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    const rawBody: Partial<TradeDocument> = await req.json()
    
    // Whitelist user-submitted fields to prevent mass assignment
    const body: Partial<TradeDocument> = {}
    if (rawBody.ticker !== undefined) body.ticker = rawBody.ticker
    if (rawBody.assetClass !== undefined) body.assetClass = rawBody.assetClass
    if (rawBody.direction !== undefined) body.direction = rawBody.direction
    if (rawBody.status !== undefined) body.status = rawBody.status
    if (rawBody.entryDateTime !== undefined) body.entryDateTime = rawBody.entryDateTime
    if (rawBody.entryPrice !== undefined) body.entryPrice = rawBody.entryPrice
    if (rawBody.exitDateTime !== undefined) body.exitDateTime = rawBody.exitDateTime
    if (rawBody.exitPrice !== undefined) body.exitPrice = rawBody.exitPrice
    if (rawBody.quantity !== undefined) body.quantity = rawBody.quantity
    if (rawBody.stopLoss !== undefined) body.stopLoss = rawBody.stopLoss
    if (rawBody.takeProfit !== undefined) body.takeProfit = rawBody.takeProfit
    if (rawBody.commission !== undefined) body.commission = rawBody.commission
    if (rawBody.fees !== undefined) body.fees = rawBody.fees
    if (rawBody.tags !== undefined) body.tags = rawBody.tags
    if (rawBody.setup !== undefined) body.setup = rawBody.setup
    if (rawBody.journalNotes !== undefined) body.journalNotes = rawBody.journalNotes
    if (rawBody.screenshot !== undefined) body.screenshot = rawBody.screenshot
    if (rawBody.emotionTag !== undefined) body.emotionTag = rawBody.emotionTag
    if (rawBody.processGrade !== undefined) body.processGrade = rawBody.processGrade
    if (rawBody.mistakeType !== undefined) body.mistakeType = rawBody.mistakeType

    // ============================================================================
    // STEP 3: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 4: Recompute P&L if relevant exit fields are being updated
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const existing = await TradeModel.findOne({ _id: id, userId }).lean<TradeDocument>()
    if (!existing) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    const merged = { ...existing, ...body }
    if (merged.status === 'CLOSED' && merged.exitPrice && merged.exitDateTime) {
      body.pnl = computePnl(
        merged.direction,
        merged.entryPrice,
        merged.exitPrice,
        merged.quantity,
        merged.commission ?? 0,
        merged.fees ?? 0
      )
      body.pnlPercent = computePnlPercent(merged.direction, merged.entryPrice, merged.exitPrice)
      body.holdingDurationMs =
        new Date(merged.exitDateTime).getTime() - new Date(merged.entryDateTime).getTime()
      body.rMultiple = computeRMultiple(merged.direction, merged.entryPrice, merged.exitPrice, merged.stopLoss)
    } else if (merged.status === 'OPEN') {
      body.pnl = 0
      body.pnlPercent = 0
      body.holdingDurationMs = null
      body.rMultiple = null
    }

    // ============================================================================
    // STEP 5: Apply partial update
    // ============================================================================
    const updated = await TradeModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: body },
      { new: true }
    ).lean<TradeDocument>()

    // ============================================================================
    // STEP 6: Return updated trade
    // ============================================================================
    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Trade PATCH] Slow: ${duration}ms`)

    if (!updated) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }
    return NextResponse.json({ ...updated, id: updated._id?.toString() ?? '' })
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Trade PATCH] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 })
  }
}

/**
 * DELETE handler — remove a trade by ID
 *
 * Flow:
 * 1. Extract trade ID from route params
 * 2. Connect to database
 * 3. Delete trade document
 * 4. Return success or 404
 *
 * @param {NextRequest} req - Incoming request
 * @param {RouteContext} context - Route context containing trade ID
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Extract trade ID from route params
    // ============================================================================
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 })
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 3: Delete trade document
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const deleted = await TradeModel.findOneAndDelete({ _id: id, userId }).lean<TradeDocument>()

    // ============================================================================
    // STEP 4: Return success or 404
    // ============================================================================
    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Trade DELETE] Slow: ${duration}ms`)

    if (!deleted) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, id })
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Trade DELETE] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 })
  }
}
