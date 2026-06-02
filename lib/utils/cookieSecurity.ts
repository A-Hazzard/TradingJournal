type RequestLike = { url: string; headers: { get: (key: string) => string | null } }

export function isSecureContext(request?: RequestLike): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true
  if (process.env.COOKIE_SECURE === 'false') return false
  if (process.env.NODE_ENV === 'development') return false
  if (request) {
    const proto = request.headers.get('x-forwarded-proto')
    if (proto) return proto === 'https'
    return request.url.startsWith('https://')
  }
  return process.env.NODE_ENV === 'production'
}

export function getAuthCookieOptions(
  request?: RequestLike,
  overrides?: Record<string, unknown>
): Record<string, unknown> {
  const secure = isSecureContext(request)
  return { httpOnly: true, secure, sameSite: 'lax' as const, path: '/', ...overrides }
}
