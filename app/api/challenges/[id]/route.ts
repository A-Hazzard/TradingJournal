/**
 * Prop Challenge Detail API Route
 *
 * Fetch a single challenge with progress, update, or delete.
 *
 * @module app/api/challenges/[id]/route
 */

import { connectDB } from '@/app/api/lib/db'
import { PropChallengeModel, type PropChallengeDocument } from '@/app/api/lib/models/propChallenge'
import { TradeModel, type TradeDocument } from '@/app/api/lib/models/trade'
import { computeChallengeProgress, type PropChallenge } from '@/lib/propChallenge'
import type { Trade } from '@/types/trade'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    await connectDB()
    const doc = await PropChallengeModel.findOne({ _id: id, userId }).lean<PropChallengeDocument>()
    if (!doc) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

    const challenge = { ...doc, id: doc._id?.toString() ?? '' } as unknown as PropChallenge
    const rawTrades = await TradeModel.find({ userId, status: 'CLOSED' })
      .sort({ entryDateTime: 1 })
      .lean<TradeDocument[]>()
    const trades = rawTrades.map((t) => ({ ...t, id: t._id?.toString() ?? '' })) as unknown as Trade[]

    const challengeTrades = trades.filter((t) => new Date(t.entryDateTime) >= new Date(challenge.startDate))

    return NextResponse.json({
      challenge,
      progress: computeChallengeProgress(challenge, trades),
      trades: challengeTrades,
    })
  } catch (e) {
    console.error('[Challenge GET] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to fetch challenge' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const rawBody: Partial<PropChallengeDocument> = await req.json()
    const body: Partial<PropChallengeDocument> = {}
    if (rawBody.name !== undefined) body.name = rawBody.name
    if (rawBody.firm !== undefined) body.firm = rawBody.firm
    if (rawBody.accountSize !== undefined) body.accountSize = rawBody.accountSize
    if (rawBody.startingBalance !== undefined) body.startingBalance = rawBody.startingBalance
    if (rawBody.profitTarget !== undefined) body.profitTarget = rawBody.profitTarget
    if (rawBody.maxDailyLoss !== undefined) body.maxDailyLoss = rawBody.maxDailyLoss
    if (rawBody.maxTotalDrawdown !== undefined) body.maxTotalDrawdown = rawBody.maxTotalDrawdown
    if (rawBody.drawdownType !== undefined) body.drawdownType = rawBody.drawdownType
    if (rawBody.startDate !== undefined) body.startDate = rawBody.startDate
    if (rawBody.endDate !== undefined) body.endDate = rawBody.endDate
    if (rawBody.phase !== undefined) body.phase = rawBody.phase
    if (rawBody.status !== undefined) body.status = rawBody.status

    await connectDB()
    const updated = await PropChallengeModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: body },
      { new: true }
    ).lean<PropChallengeDocument>()

    if (!updated) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    return NextResponse.json({ ...updated, id: updated._id?.toString() ?? '' })
  } catch (e) {
    console.error('[Challenge PATCH] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to update challenge' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    await connectDB()
    const deleted = await PropChallengeModel.findOneAndDelete({ _id: id, userId }).lean<PropChallengeDocument>()
    if (!deleted) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    return NextResponse.json({ success: true, id })
  } catch (e) {
    console.error('[Challenge DELETE] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to delete challenge' }, { status: 500 })
  }
}
