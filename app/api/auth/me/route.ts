/**
 * @module app/api/auth/me/route
 */

import { connectDB } from '@/app/api/lib/db'
import { UserModel } from '@/app/api/lib/models/user'
import { getTokenFromRequest, verifyToken, signToken } from '@/lib/auth'
import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Verify token
    // ============================================================================
    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let payload
    try {
      payload = await verifyToken(token)
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // ============================================================================
    // STEP 2: Fetch user from database
    // ============================================================================
    await connectDB()
    const user = await UserModel.findOne({ _id: payload.userId })
      .select('-passwordHash')
      .lean()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
  } catch (e) {
    console.error('[Auth Me] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Authenticate user
    // ============================================================================
    const token = getTokenFromRequest(req)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let payload
    try {
      payload = await verifyToken(token)
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    const body: {
      username?: string
      email?: string
      currentPassword?: string
      newPassword?: string
    } = await req.json()

    const { username, email, currentPassword, newPassword } = body

    if (username !== undefined && username.trim().length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    }

    if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    if (newPassword && newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }

    // ============================================================================
    // STEP 3: Fetch current user document
    // ============================================================================
    await connectDB()
    const user = await UserModel.findOne({ _id: payload.userId })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ============================================================================
    // STEP 4: Handle password change
    // ============================================================================
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required to set a new password' }, { status: 400 })
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isMatch) {
        return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 })
      }
      user.passwordHash = await bcrypt.hash(newPassword, 12)
    }

    // ============================================================================
    // STEP 5: Update other details
    // ============================================================================
    if (username) {
      // Check if username is taken by someone else
      const dupUsername = await UserModel.findOne({
        username: username.trim(),
        _id: { $ne: user._id },
      }).lean()
      if (dupUsername) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
      }
      user.username = username.trim()
    }

    if (email) {
      // Check if email is taken by someone else
      const dupEmail = await UserModel.findOne({
        email: email.toLowerCase(),
        _id: { $ne: user._id },
      }).lean()
      if (dupEmail) {
        return NextResponse.json({ error: 'Email is already registered' }, { status: 409 })
      }
      user.email = email.toLowerCase()
    }

    await user.save()

    // ============================================================================
    // STEP 6: Sign a new JWT if username updated and set cookie
    // ============================================================================
    const responseData = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    }

    const response = NextResponse.json(responseData)

    if (username && username.trim() !== payload.username) {
      const newToken = await signToken({
        userId: user._id.toString(),
        username: user.username,
        role: user.role as 'user' | 'admin',
      })
      const cookieOpts = getAuthCookieOptions(req)
      response.cookies.set('token', newToken, cookieOpts as Parameters<typeof response.cookies.set>[2])
    }

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Auth Me PUT] Slow: ${duration}ms`)

    return response
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Auth Me PUT] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
