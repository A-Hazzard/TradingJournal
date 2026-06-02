/**
 * @module app/api/admin/users/route
 */

import { connectDB } from '@/app/api/lib/db'
import { UserModel } from '@/app/api/lib/models/user'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
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
    // STEP 2: Fetch all users
    // ============================================================================
    await connectDB()
    const users = await UserModel.find({})
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean()

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Admin Users GET] Slow: ${duration}ms`)

    return NextResponse.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        username: u.username,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      })),
      total: users.length,
    })
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Admin Users GET] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
