/**
 * Journal API Route
 *
 * Handles daily journal entry management for the TradeJournal platform.
 * It supports:
 * - List all journal entries (optionally filtered by date range)
 * - Upsert a journal entry for a specific date
 *
 * @module app/api/journal/route
 */

import { connectDB } from '@/app/api/lib/db'
import { JournalModel, type JournalDocument } from '@/app/api/lib/models/journal'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET handler — list journal entries
 *
 * Flow:
 * 1. Parse optional date filter parameters
 * 2. Connect to database
 * 3. Fetch entries sorted by date descending
 * 4. Return JSON response
 *
 * @param {NextRequest} req - Optional query params: dateStart, dateEnd
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Parse optional date filter parameters
    // ============================================================================
    const { searchParams } = new URL(req.url)
    const dateStart = searchParams.get('dateStart')
    const dateEnd = searchParams.get('dateEnd')

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 3: Fetch entries sorted by date descending
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const filter: Record<string, unknown> = { userId }
    if (dateStart || dateEnd) {
      const dateFilter: Record<string, string> = {}
      if (dateStart) dateFilter.$gte = dateStart
      if (dateEnd) dateFilter.$lte = dateEnd
      filter.date = dateFilter
    }

    const entries = await JournalModel.find(filter)
      .sort({ date: -1 })
      .lean<JournalDocument[]>()

    // ============================================================================
    // STEP 4: Return JSON response
    // ============================================================================
    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Journal GET] Slow: ${duration}ms`)

    return NextResponse.json(
      entries.map((entry) => ({ ...entry, id: entry._id?.toString() ?? '' }))
    )
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Journal GET] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to fetch journal entries' }, { status: 500 })
  }
}

/**
 * POST handler — upsert a journal entry for a specific date
 *
 * Flow:
 * 1. Parse and validate request body
 * 2. Connect to database
 * 3. Upsert entry (findOneAndUpdate with upsert:true keyed on date)
 * 4. Return upserted entry
 *
 * @body {object} - date (required), content, mood, dailyGoal, lessonLearned
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Parse and validate request body
    // ============================================================================
    const rawBody: Partial<JournalDocument> = await req.json()

    if (!rawBody.date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 3: Upsert entry keyed on date
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const date = rawBody.date
    const rest = {
      content: rawBody.content,
      mood: rawBody.mood,
      dailyGoal: rawBody.dailyGoal,
      lessonLearned: rawBody.lessonLearned,
      preSessionChecklist: rawBody.preSessionChecklist,
      mentalScore: rawBody.mentalScore,
    }

    const entry = await JournalModel.findOneAndUpdate(
      { userId, date },
      { $set: { userId, date, ...rest } },
      { upsert: true, new: true }
    ).lean<JournalDocument>()

    // ============================================================================
    // STEP 4: Return upserted entry
    // ============================================================================
    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Journal POST] Slow: ${duration}ms`)

    return NextResponse.json(
      { ...entry, id: entry?._id?.toString() ?? '' },
      { status: 201 }
    )
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Journal POST] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to save journal entry' }, { status: 500 })
  }
}
