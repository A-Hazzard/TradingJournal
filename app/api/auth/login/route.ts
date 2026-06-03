/**
 * @module app/api/auth/login/route
 */

import { connectDB } from '@/app/api/lib/db'
import { UserModel } from '@/app/api/lib/models/user'
import { signToken } from '@/lib/auth'
import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

type AttemptRecord = {
  count: number
  resetTime: number
}

const loginAttempts = new Map<string, AttemptRecord>()

function checkRateLimit(key: string): { blocked: boolean; timeLeftSeconds: number } {
  const now = Date.now()
  const record = loginAttempts.get(key)
  if (!record) return { blocked: false, timeLeftSeconds: 0 }

  if (now > record.resetTime) {
    loginAttempts.delete(key)
    return { blocked: false, timeLeftSeconds: 0 }
  }

  if (record.count >= 5) {
    return { blocked: true, timeLeftSeconds: Math.ceil((record.resetTime - now) / 1000) }
  }

  return { blocked: false, timeLeftSeconds: 0 }
}

function recordFailure(key: string) {
  const now = Date.now()
  const record = loginAttempts.get(key)
  if (!record || now > record.resetTime) {
    loginAttempts.set(key, { count: 1, resetTime: now + 15 * 60 * 1000 })
  } else {
    record.count += 1
  }
}

function recordSuccess(key: string) {
  loginAttempts.delete(key)
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  try {
    // ============================================================================
    // STEP 1: Parse request body — accept email OR username via `identifier`
    // ============================================================================
    const body: { identifier?: string; email?: string; password?: string } = await req.json()
    const { password } = body
    const identifier = (body.identifier ?? body.email ?? '').trim()

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/username and password are required' }, { status: 400 })
    }

    // Resolve client IP for rate limiting
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
    const limitKey = `${ip}:${identifier.toLowerCase()}`

    const limitStatus = checkRateLimit(limitKey)
    if (limitStatus.blocked) {
      return NextResponse.json(
        { error: `Too many failed login attempts. Please try again in ${limitStatus.timeLeftSeconds} seconds.` },
        { status: 429 }
      )
    }

    // ============================================================================
    // STEP 2: Connect to database and find user by email OR username
    // ============================================================================
    await connectDB()
    const isEmail = identifier.includes('@')
    const user = await UserModel.findOne(
      isEmail
        ? { email: identifier.toLowerCase() }
        : { username: identifier }
    ).lean()

    // Generic message — don't reveal whether the account exists
    if (!user) {
      recordFailure(limitKey)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // ============================================================================
    // STEP 3: Verify password
    // ============================================================================
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      recordFailure(limitKey)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Reset rate limiter on successful authentication
    recordSuccess(limitKey)

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
