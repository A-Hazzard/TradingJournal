/**
 * Delete Account API Route (GDPR Compliant)
 *
 * Purges the current user's profile and all associated data.
 *
 * @module app/api/auth/delete-account/route
 */

import { connectDB } from '@/app/api/lib/db'
import { UserModel } from '@/app/api/lib/models/user'
import { TradeModel } from '@/app/api/lib/models/trade'
import { JournalModel } from '@/app/api/lib/models/journal'
import { RiskSettingsModel } from '@/app/api/lib/models/riskSettings'
import { SetupModel } from '@/app/api/lib/models/setup'
import { PropChallengeModel } from '@/app/api/lib/models/propChallenge'
import { NotificationModel } from '@/app/api/lib/models/notification'
import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(req: NextRequest) {
  const startTime = Date.now()
  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // 1. Check if user is the last admin
    const user = await UserModel.findOne({ _id: userId }).lean()
    if (user && user.role === 'admin') {
      const adminCount = await UserModel.countDocuments({ role: 'admin' })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin account in the system.' },
          { status: 400 }
        )
      }
    }

    // 2. Delete all records matching userId
    await Promise.all([
      TradeModel.deleteMany({ userId }),
      JournalModel.deleteMany({ userId }),
      RiskSettingsModel.deleteMany({ userId }),
      SetupModel.deleteMany({ userId }),
      PropChallengeModel.deleteMany({ userId }),
      NotificationModel.deleteMany({ userId }),
      UserModel.deleteOne({ _id: userId }),
    ])

    // 3. Clear token cookie
    const response = NextResponse.json({ success: true })
    const clearOpts = getAuthCookieOptions(req, { maxAge: 0, expires: new Date(0) })
    response.cookies.set('token', '', clearOpts as Parameters<typeof response.cookies.set>[2])

    const duration = Date.now() - startTime
    if (duration > 1000) console.warn(`[Delete Account DELETE] Slow: ${duration}ms`)

    return response
  } catch (e) {
    console.error('[Delete Account DELETE] Error:', e instanceof Error ? e.message : 'Unknown error')
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
