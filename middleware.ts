import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth'

const AUTH_PAGES = ['/login', '/signup']
const ADMIN_PATHS = ['/admin']
const PUBLIC_API_PATHS = ['/api/auth/login', '/api/auth/signup', '/api/auth/logout']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value ?? getTokenFromRequest(request)

  // API route protection
  if (pathname.startsWith('/api')) {
    if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
      return NextResponse.next()
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const payload = await verifyToken(token)
      // Inject user info into request headers
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', payload.userId)
      requestHeaders.set('x-user-role', payload.role)
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }
  }

  // Auth pages — redirect already-logged-in users to dashboard
  if (AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    if (token) {
      try {
        await verifyToken(token)
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } catch {
        // invalid token — let them see the auth page
      }
    }
    return NextResponse.next()
  }

  // All other pages require a valid token
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const payload = await verifyToken(token)

    // Admin pages require admin role
    if (ADMIN_PATHS.some((p) => pathname.startsWith(p)) && payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

