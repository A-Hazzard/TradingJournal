/**
 * Prop Challenges API Route
 *
 * Manages a user's prop firm challenges. Supports listing all challenges
 * (with computed progress) and creating new ones.
 *
 * @module app/api/challenges/route
 */

import { connectDB } from '@/app/api/lib/db'
import { PropChallengeModel, type PropChallengeDocument } from '@/app/api/lib/models/propChallenge'
import { TradeModel, type TradeDocument } from '@/app/api/lib/models/trade'
import { computeChallengeProgress, type PropChallenge } from '@/lib/propChallenge'
import type { Trade } from '@/types/trade'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET handler — list challenges with computed progress
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await connectDB()
    const challenges = await PropChallengeModel.find({ userId }).sort({ createdAt: -1 }).lean<PropChallengeDocument[]>()
    const rawTrades = await TradeModel.find({ userId, status: 'CLOSED' }).lean<TradeDocument[]>()
    const trades = rawTrades.map((t) => ({ ...t, id: t._id?.toString() ?? '' })) as unknown as Trade[]

    const result = challenges.map((c) => {
      const challenge = { ...c, id: c._id?.toString() ?? '' } as unknown as PropChallenge
      return { ...challenge, progress: computeChallengeProgress(challenge, trades) }
    })

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Challenges GET] Slow: ${duration}ms`)

    return NextResponse.json(result)
  } catch (e) {
    console.error('[Challenges GET] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 })
  }
}

/**
 * POST handler — create a new challenge
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rawBody: Partial<PropChallengeDocument> = await req.json()
    const body = {
      name: rawBody.name,
      firm: rawBody.firm,
      accountSize: rawBody.accountSize,
      startingBalance: rawBody.startingBalance,
      profitTarget: rawBody.profitTarget,
      maxDailyLoss: rawBody.maxDailyLoss,
      maxTotalDrawdown: rawBody.maxTotalDrawdown,
      drawdownType: rawBody.drawdownType,
      startDate: rawBody.startDate,
      endDate: rawBody.endDate,
      phase: rawBody.phase,
      status: rawBody.status,
    }
    if (!body.name || !body.accountSize || !body.profitTarget) {
      return NextResponse.json({ error: 'name, accountSize and profitTarget are required' }, { status: 400 })
    }

    await connectDB()
    const challenge = await PropChallengeModel.create({
      ...body,
      userId,
      startingBalance: body.startingBalance ?? body.accountSize,
      startDate: body.startDate ?? new Date().toISOString().slice(0, 10),
    })

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Challenges POST] Slow: ${duration}ms`)

    const created = await PropChallengeModel.findOne({ _id: challenge._id }).lean<PropChallengeDocument>()
    return NextResponse.json({ ...created, id: created?._id?.toString() ?? '' }, { status: 201 })
  } catch (e) {
    console.error('[Challenges POST] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to create challenge' }, { status: 500 })
  }
}
