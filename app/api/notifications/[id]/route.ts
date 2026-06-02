/**
 * Notification Item Actions API Route
 *
 * Handles operations on a single notification instance:
 * - Mark a notification as read (PATCH)
 * - Delete a notification (DELETE)
 *
 * @module app/api/notifications/[id]/route
 */

import { connectDB } from '@/app/api/lib/db'
import { NotificationModel } from '@/app/api/lib/models/notification'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    // ============================================================================
    // STEP 1: Extract notification ID from route params
    // ============================================================================
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
    }

    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 3: Mark notification as read
    // ============================================================================
    const updated = await NotificationModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: { read: true } },
      { new: true }
    ).lean()

    if (!updated) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // ============================================================================
    // STEP 4: Return response
    // ============================================================================
    return NextResponse.json({ ...updated, id: updated._id.toString() })
  } catch (e) {
    console.error('[Notification PATCH] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    // ============================================================================
    // STEP 1: Extract notification ID from route params
    // ============================================================================
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
    }

    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 3: Delete notification document
    // ============================================================================
    const deleted = await NotificationModel.findOneAndDelete({ _id: id, userId }).lean()

    if (!deleted) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // ============================================================================
    // STEP 4: Return response
    // ============================================================================
    return NextResponse.json({ success: true, id })
  } catch (e) {
    console.error('[Notification DELETE] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
  }
}
