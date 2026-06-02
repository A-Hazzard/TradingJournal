/**
 * Notifications API Route
 *
 * Handles system notification fetching, marking all read, and clearing notifications.
 *
 * @module app/api/notifications/route
 */

import { connectDB } from '@/app/api/lib/db'
import { NotificationModel } from '@/app/api/lib/models/notification'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Parse parameters and verify auth
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 3: Fetch notifications sorted by createdAt descending
    // ============================================================================
    const notifications = await NotificationModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean()

    // ============================================================================
    // STEP 4: Return response
    // ============================================================================
    return NextResponse.json(
      notifications.map((n) => ({ ...n, id: n._id.toString() }))
    )
  } catch (e) {
    console.error('[Notifications GET] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Parse parameters and verify auth
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 3: Update all unread notifications to read
    // ============================================================================
    await NotificationModel.updateMany({ userId, read: false }, { $set: { read: true } })

    // ============================================================================
    // STEP 4: Return response
    // ============================================================================
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[Notifications PUT] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Parse parameters and verify auth
    // ============================================================================
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 3: Delete all notifications for the user
    // ============================================================================
    await NotificationModel.deleteMany({ userId })

    // ============================================================================
    // STEP 4: Return response
    // ============================================================================
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[Notifications DELETE] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 })
  }
}
