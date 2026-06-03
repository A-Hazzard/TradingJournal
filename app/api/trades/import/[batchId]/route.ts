/**
 * Import Batch API Route
 *
 * Undo an import — deletes all trades in a batch and the import log.
 *
 * @module app/api/trades/import/[batchId]/route
 */

import { connectDB } from '@/app/api/lib/db'
import { TradeModel } from '@/app/api/lib/models/trade'
import { ImportLogModel } from '@/app/api/lib/models/importLog'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ batchId: string }> }

export async function DELETE(req: NextRequest, context: RouteContext) {
  const startTime = Date.now()
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { batchId } = await context.params
    if (!batchId) return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 })

    await connectDB()
    const result = await TradeModel.deleteMany({ userId, importBatchId: batchId })
    await ImportLogModel.findOneAndDelete({ _id: batchId, userId })

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Import Undo] Slow: ${duration}ms`)

    return NextResponse.json({ success: true, deleted: result.deletedCount ?? 0 })
  } catch (e) {
    console.error('[Import Undo] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to undo import' }, { status: 500 })
  }
}
