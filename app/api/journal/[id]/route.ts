/**
 * Journal Entry Detail API Route
 *
 * Handles individual journal entry operations.
 * It supports:
 * - Fetch a single entry by ID
 * - Update a journal entry (partial PATCH)
 * - Delete a journal entry
 *
 * @module app/api/journal/[id]/route
 */

import { connectDB } from '@/app/api/lib/db'
import { JournalModel, type JournalDocument } from '@/app/api/lib/models/journal'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET handler — fetch a single journal entry by ID
 *
 * Flow:
 * 1. Extract entry ID from route params
 * 2. Connect to database
 * 3. Fetch entry document
 * 4. Return entry or 404
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Extract entry ID from route params
    // ============================================================================
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 3: Fetch entry document
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const entry = await JournalModel.findOne({ _id: id, userId }).lean<JournalDocument>()

    // ============================================================================
    // STEP 4: Return entry or 404
    // ============================================================================
    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Journal GET] Slow: ${duration}ms`)

    if (!entry) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 })
    }
    return NextResponse.json({ ...entry, id: entry._id?.toString() ?? '' })
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Journal GET] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to fetch journal entry' }, { status: 500 })
  }
}

/**
 * PATCH handler — update journal entry fields
 *
 * Flow:
 * 1. Extract entry ID from route params
 * 2. Parse request body
 * 3. Connect to database
 * 4. Apply partial update
 * 5. Return updated entry
 *
 * @body {Partial<JournalDocument>} - Fields to update: content, mood, dailyGoal, lessonLearned
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Extract entry ID from route params
    // ============================================================================
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })
    }

    // ============================================================================
    // STEP 2: Parse request body
    // ============================================================================
    const body: Partial<JournalDocument> = await req.json()

    // ============================================================================
    // STEP 3: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 4: Apply partial update
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const updated = await JournalModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: body },
      { new: true }
    ).lean<JournalDocument>()

    // ============================================================================
    // STEP 5: Return updated entry
    // ============================================================================
    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Journal PATCH] Slow: ${duration}ms`)

    if (!updated) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 })
    }
    return NextResponse.json({ ...updated, id: updated._id?.toString() ?? '' })
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Journal PATCH] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to update journal entry' }, { status: 500 })
  }
}

/**
 * DELETE handler — remove a journal entry by ID
 *
 * Flow:
 * 1. Extract entry ID from route params
 * 2. Connect to database
 * 3. Delete entry document
 * 4. Return success or 404
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Extract entry ID from route params
    // ============================================================================
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 3: Delete entry document
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const deleted = await JournalModel.findOneAndDelete({ _id: id, userId }).lean<JournalDocument>()

    // ============================================================================
    // STEP 4: Return success or 404
    // ============================================================================
    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Journal DELETE] Slow: ${duration}ms`)

    if (!deleted) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, id })
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Journal DELETE] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to delete journal entry' }, { status: 500 })
  }
}
