/**
 * Setup Detail API Route
 *
 * Fetch a single setup with computed performance stats, update, or soft-delete.
 *
 * @module app/api/setups/[id]/route
 */

import { connectDB } from '@/app/api/lib/db'
import { SetupModel, type SetupDocument } from '@/app/api/lib/models/setup'
import { TradeModel, type TradeDocument } from '@/app/api/lib/models/trade'
import { computeSetupPerformance } from '@/lib/playbook'
import type { Trade } from '@/types/trade'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET handler — fetch setup + performance stats from trades matching its name
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const startTime = Date.now()
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'Setup ID is required' }, { status: 400 })

    await connectDB()
    const setup = await SetupModel.findOne({ _id: id, userId }).lean<SetupDocument>()
    if (!setup) return NextResponse.json({ error: 'Setup not found' }, { status: 404 })

    // Match trades by setup name (trades store setup as display string)
    const rawTrades = await TradeModel.find({ userId, setup: setup.name, status: 'CLOSED' })
      .sort({ entryDateTime: 1 })
      .lean<TradeDocument[]>()

    const trades = rawTrades.map((t) => ({ ...t, id: t._id?.toString() ?? '' })) as unknown as Trade[]
    const stats = computeSetupPerformance(trades)

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Setup GET] Slow: ${duration}ms`)

    return NextResponse.json({
      setup: { ...setup, id: setup._id?.toString() ?? '' },
      stats,
      trades,
    })
  } catch (e) {
    console.error('[Setup GET] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to fetch setup' }, { status: 500 })
  }
}

/**
 * PATCH handler — update setup fields
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const startTime = Date.now()
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'Setup ID is required' }, { status: 400 })

    const rawBody: Partial<SetupDocument> = await req.json()
    const body: Partial<SetupDocument> = {}
    if (rawBody.name !== undefined) body.name = rawBody.name
    if (rawBody.description !== undefined) body.description = rawBody.description
    if (rawBody.entryRules !== undefined) body.entryRules = rawBody.entryRules
    if (rawBody.exitRules !== undefined) body.exitRules = rawBody.exitRules
    if (rawBody.idealConditions !== undefined) body.idealConditions = rawBody.idealConditions
    if (rawBody.timeframes !== undefined) body.timeframes = rawBody.timeframes
    if (rawBody.assetClasses !== undefined) body.assetClasses = rawBody.assetClasses
    if (rawBody.tags !== undefined) body.tags = rawBody.tags
    if (rawBody.isActive !== undefined) body.isActive = rawBody.isActive

    await connectDB()
    const updated = await SetupModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: body },
      { new: true }
    ).lean<SetupDocument>()

    if (!updated) return NextResponse.json({ error: 'Setup not found' }, { status: 404 })

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Setup PATCH] Slow: ${duration}ms`)

    return NextResponse.json({ ...updated, id: updated._id?.toString() ?? '' })
  } catch (e) {
    console.error('[Setup PATCH] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to update setup' }, { status: 500 })
  }
}

/**
 * DELETE handler — soft delete (isActive: false)
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const startTime = Date.now()
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'Setup ID is required' }, { status: 400 })

    await connectDB()
    const deleted = await SetupModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isActive: false } },
      { new: true }
    ).lean<SetupDocument>()

    if (!deleted) return NextResponse.json({ error: 'Setup not found' }, { status: 404 })

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Setup DELETE] Slow: ${duration}ms`)

    return NextResponse.json({ success: true, id })
  } catch (e) {
    console.error('[Setup DELETE] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to delete setup' }, { status: 500 })
  }
}
