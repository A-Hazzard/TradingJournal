/**
 * Global Search API Route
 *
 * Query trades and daily journal entries for the current user.
 *
 * @module app/api/search/route
 */

import { connectDB } from '@/app/api/lib/db'
import { TradeModel } from '@/app/api/lib/models/trade'
import { JournalModel } from '@/app/api/lib/models/journal'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Parse and validate query string
    // ============================================================================
    const { searchParams } = new URL(req.url)
    const rawQuery = searchParams.get('q')?.trim() ?? ''
    const query = rawQuery.slice(0, 100)
    const userId = req.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!query) {
      return NextResponse.json({ trades: [], journals: [] })
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 3: Execute searches concurrently with limits
    // ============================================================================
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escapedQuery, 'i')

    const [trades, journals] = await Promise.all([
      TradeModel.find({
        userId,
        $or: [
          { ticker: regex },
          { journalNotes: regex },
          { setup: regex },
          { tags: regex },
        ],
      })
        .sort({ entryDateTime: -1 })
        .limit(10)
        .lean(),

      JournalModel.find({
        userId,
        $or: [
          { content: regex },
          { dailyGoal: regex },
          { lessonLearned: regex },
        ],
      })
        .sort({ date: -1 })
        .limit(10)
        .lean(),
    ])

    // ============================================================================
    // STEP 4: Return response
    // ============================================================================
    return NextResponse.json({
      trades: trades.map((t) => ({ ...t, id: t._id.toString() })),
      journals: journals.map((j) => ({ ...j, id: j._id.toString() })),
    })
  } catch (e) {
    console.error('[Search GET] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
