/**
 * Risk Settings API Route
 *
 * Manages a user's risk configuration — account balance, daily loss limit,
 * per-trade risk tolerance.
 *
 * @module app/api/risk/settings/route
 */

import { connectDB } from '@/app/api/lib/db'
import { RiskSettingsModel, type RiskSettingsDocument } from '@/app/api/lib/models/riskSettings'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET handler — return current user's risk settings (create defaults if none)
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Resolve user from middleware-injected header
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ============================================================================
    // STEP 2: Connect to DB and fetch (or lazily create) settings
    // ============================================================================
    await connectDB()
    let settings = await RiskSettingsModel.findOne({ userId }).lean<RiskSettingsDocument>()
    if (!settings) {
      const created = await RiskSettingsModel.create({ userId })
      settings = created.toObject() as unknown as RiskSettingsDocument
    }

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Risk Settings GET] Slow: ${duration}ms`)

    return NextResponse.json({ ...settings, id: settings._id?.toString() ?? '' })
  } catch (e) {
    console.error('[Risk Settings GET] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to fetch risk settings' }, { status: 500 })
  }
}

/**
 * PATCH handler — upsert risk settings for current user
 */
export async function PATCH(req: NextRequest) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Resolve user + parse body
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: Partial<RiskSettingsDocument> = await req.json()
    const { accountBalance, startingBalance, dailyLossLimit, maxRiskPerTrade, maxDailyRiskPercent } = body

    // ============================================================================
    // STEP 2: Connect to DB and upsert
    // ============================================================================
    await connectDB()
    const updated = await RiskSettingsModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          ...(accountBalance !== undefined && { accountBalance }),
          ...(startingBalance !== undefined && { startingBalance }),
          ...(dailyLossLimit !== undefined && { dailyLossLimit }),
          ...(maxRiskPerTrade !== undefined && { maxRiskPerTrade }),
          ...(maxDailyRiskPercent !== undefined && { maxDailyRiskPercent }),
        },
      },
      { upsert: true, new: true }
    ).lean<RiskSettingsDocument>()

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Risk Settings PATCH] Slow: ${duration}ms`)

    return NextResponse.json({ ...updated, id: updated?._id?.toString() ?? '' })
  } catch (e) {
    console.error('[Risk Settings PATCH] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to update risk settings' }, { status: 500 })
  }
}
