/**
 * @module app/api/auth/login/route
 */

import { connectDB } from '@/app/api/lib/db'
import { UserModel } from '@/app/api/lib/models/user'
import { signToken } from '@/lib/auth'
import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Parse request body
    // ============================================================================
    const body: { email?: string; password?: string } = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // ============================================================================
    // STEP 2: Connect to database and find user
    // ============================================================================
    await connectDB()
    const user = await UserModel.findOne({ email: email.toLowerCase() }).lean()

    // Generic message — don't reveal whether email exists
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // ============================================================================
    // STEP 3: Verify password
    // ============================================================================
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // ============================================================================
    // STEP 4: Sign JWT and set cookie
    // ============================================================================
    const token = await signToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role as 'user' | 'admin',
    })

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Auth Login] Slow: ${duration}ms`)

    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      },
    })

    const cookieOpts = getAuthCookieOptions(req)
    response.cookies.set('token', token, cookieOpts as Parameters<typeof response.cookies.set>[2])

    return response
  } catch (e) {
    const duration = Date.now() - startTime
    console.error(`[Auth Login] Error after ${duration}ms:`, e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 })
  }
}
