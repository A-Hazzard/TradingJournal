/**
 * @module app/api/admin/users/[id]/route
 */

import { connectDB } from '@/app/api/lib/db'
import { UserModel } from '@/app/api/lib/models/user'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(req: NextRequest, context: RouteContext) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Verify token and admin role
    // ============================================================================
    const token = getTokenFromRequest(req)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let payload
    try {
      payload = await verifyToken(token)
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ============================================================================
    // STEP 2: Extract and validate target user ID
    // ============================================================================
    const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 })

    if (id === payload.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // ============================================================================
    // STEP 3: Delete user
    // ============================================================================
    await connectDB()
    const deleted = await UserModel.findOneAndDelete({ _id: id }).lean()

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Admin Users DELETE] Slow: ${duration}ms`)

    if (!deleted) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({ success: true, id })
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Admin Users DELETE] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
