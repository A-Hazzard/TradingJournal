/**
 * @module app/api/auth/logout/route
 */

import { getAuthCookieOptions } from '@/lib/utils/cookieSecurity'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true })
  const clearOpts = getAuthCookieOptions(req, { maxAge: 0, expires: new Date(0) })
  response.cookies.set('token', '', clearOpts as Parameters<typeof response.cookies.set>[2])
  return response
}
