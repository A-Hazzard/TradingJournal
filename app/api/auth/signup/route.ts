/**
 * @module app/api/auth/signup/route
 */

import { connectDB } from '@/app/api/lib/db'
import { UserModel } from '@/app/api/lib/models/user'
import { signToken } from '@/lib/auth'
import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity'
import { NotificationModel } from '@/app/api/lib/models/notification'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Parse and validate request body
    // ============================================================================
    const body: { username?: string; email?: string; password?: string } = await req.json()
    const { username, email, password } = body

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'username, email and password are required' },
        { status: 400 }
      )
    }
    if (username.trim().length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB()

    // ============================================================================
    // STEP 3: Check uniqueness
    // ============================================================================
    const existing = await UserModel.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.trim() }],
    }).lean()

    if (existing) {
      return NextResponse.json(
        { error: 'An account with that email or username already exists' },
        { status: 409 }
      )
    }

    // ============================================================================
    // STEP 4: Hash password and create user
    // ============================================================================
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await UserModel.create({ username: username.trim(), email, passwordHash })

    // Create welcome notification
    await NotificationModel.create({
      userId: user._id,
      title: 'Welcome to TradeJournal! 🎉',
      message: 'Get started by journaling your first trade. Track your analytics, set Stop Loss / Take Profit metrics, and grow your trading performance.',
      type: 'success',
    })

    // ============================================================================
    // STEP 5: Sign JWT and set cookie
    // ============================================================================
    const token = await signToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role as 'user' | 'admin',
    })

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Auth Signup] Slow: ${duration}ms`)

    const response = NextResponse.json(
      {
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    )

    const cookieOpts = getAuthCookieOptions(req)
    response.cookies.set('token', token, cookieOpts as Parameters<typeof response.cookies.set>[2])

    return response
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Auth Signup] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
