/**
 * Trade Import API Route
 *
 * Accepts already-parsed trades (parsed client-side with papaparse), runs
 * duplicate detection, bulk inserts non-duplicates, and records an ImportLog.
 *
 * @module app/api/trades/import/route
 */

import { connectDB } from '@/app/api/lib/db'
import { TradeModel } from '@/app/api/lib/models/trade'
import { ImportLogModel } from '@/app/api/lib/models/importLog'
import { computePnl, computePnlPercent, computeRMultiple } from '@/lib/calculations'
import type { ParsedTrade } from '@/lib/brokerParsers'
import { NextRequest, NextResponse } from 'next/server'

type ImportBody = {
  broker: string
  filename: string
  trades: ParsedTrade[]
  errors?: string[]
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Resolve user + parse body
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: ImportBody = await req.json()
    const { broker, filename, trades, errors = [] } = body
    if (!Array.isArray(trades) || trades.length === 0) {
      return NextResponse.json({ error: 'No trades to import' }, { status: 400 })
    }

    // ============================================================================
    // STEP 2: Connect + create the import log shell (so we have a batchId)
    // ============================================================================
    await connectDB()
    const log = await ImportLogModel.create({
      userId, filename, broker, totalRows: trades.length, status: 'success',
    })

    // ============================================================================
    // STEP 3: Dedup + build insert documents
    // ============================================================================
    let imported = 0
    let skipped = 0
    const docs: Record<string, unknown>[] = []

    for (const t of trades) {
      // Duplicate: same user, ticker, entry time, quantity, direction
      const dupe = await TradeModel.findOne({
        userId,
        ticker: t.ticker,
        entryDateTime: t.entryDateTime,
        quantity: t.quantity,
        direction: t.direction,
      }).lean()

      if (dupe) {
        skipped++
        continue
      }

      let pnl = 0
      let pnlPercent = 0
      let rMultiple: number | null = null
      let holdingDurationMs: number | null = null

      if (t.status === 'CLOSED' && t.exitPrice && t.exitDateTime) {
        pnl = computePnl(t.direction, t.entryPrice, t.exitPrice, t.quantity, t.commission, t.fees)
        pnlPercent = computePnlPercent(t.direction, t.entryPrice, t.exitPrice)
        rMultiple = computeRMultiple(t.direction, t.entryPrice, t.exitPrice, null)
        holdingDurationMs = new Date(t.exitDateTime).getTime() - new Date(t.entryDateTime).getTime()
      }

      docs.push({
        ...t,
        userId,
        pnl,
        pnlPercent,
        rMultiple,
        holdingDurationMs,
        importedFrom: broker,
        importBatchId: log._id,
      })
      imported++
    }

    // ============================================================================
    // STEP 4: Bulk insert
    // ============================================================================
    if (docs.length > 0) {
      await TradeModel.insertMany(docs, { ordered: false })
    }

    // ============================================================================
    // STEP 5: Finalize import log
    // ============================================================================
    const status = errors.length > 0 ? (imported > 0 ? 'partial' : 'failed') : 'success'
    await ImportLogModel.findOneAndUpdate(
      { _id: log._id },
      { $set: { imported, skipped, errors: errors.length, errorMessages: errors.slice(0, 50), status } }
    )

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Trade Import] Slow: ${duration}ms`)

    return NextResponse.json({
      imported, skipped, errors: errors.length, errorMessages: errors,
      batchId: log._id.toString(),
    }, { status: 201 })
  } catch (e) {
    console.error('[Trade Import] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to import trades' }, { status: 500 })
  }
}
