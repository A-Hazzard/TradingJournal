/**
 * Setups API Route
 *
 * Manages a user's playbook — formal trading setup definitions.
 * Supports listing all setups and creating new ones.
 *
 * @module app/api/setups/route
 */

import { connectDB } from '@/app/api/lib/db'
import { SetupModel, type SetupDocument } from '@/app/api/lib/models/setup'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET handler — list setups for current user
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Resolve user + parse filters
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    // ============================================================================
    // STEP 2: Fetch setups
    // ============================================================================
    await connectDB()
    const filter: Record<string, unknown> = { userId }
    if (activeOnly) filter.isActive = true

    const setups = await SetupModel.find(filter).sort({ createdAt: -1 }).lean<SetupDocument[]>()

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Setups GET] Slow: ${duration}ms`)

    return NextResponse.json(setups.map((s) => ({ ...s, id: s._id?.toString() ?? '' })))
  } catch (e) {
    console.error('[Setups GET] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to fetch setups' }, { status: 500 })
  }
}

/**
 * POST handler — create a new setup
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Resolve user + validate body
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rawBody: Partial<SetupDocument> = await req.json()
    const body = {
      name: rawBody.name,
      description: rawBody.description,
      entryRules: rawBody.entryRules,
      exitRules: rawBody.exitRules,
      idealConditions: rawBody.idealConditions,
      timeframes: rawBody.timeframes,
      assetClasses: rawBody.assetClasses,
      tags: rawBody.tags,
      isActive: rawBody.isActive,
    }
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Setup name is required' }, { status: 400 })
    }

    // ============================================================================
    // STEP 2: Create setup
    // ============================================================================
    await connectDB()
    const setup = await SetupModel.create({ ...body, userId, name: body.name.trim() })

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Setups POST] Slow: ${duration}ms`)

    const created = await SetupModel.findOne({ _id: setup._id }).lean<SetupDocument>()
    return NextResponse.json({ ...created, id: created?._id?.toString() ?? '' }, { status: 201 })
  } catch (e) {
    console.error('[Setups POST] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to create setup' }, { status: 500 })
  }
}
