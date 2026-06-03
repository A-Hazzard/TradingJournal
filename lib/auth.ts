import * as jose from 'jose'

export type JwtPayload = {
  userId: string
  username: string
  role: 'user' | 'admin'
}

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
  throw new Error('JWT_SECRET environment variable is missing')
}

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'test-secret-key-at-least-32-chars-long-for-hs256'
)

export async function signToken(payload: JwtPayload): Promise<string> {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? '7d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jose.jwtVerify(token, SECRET)
  return payload as unknown as JwtPayload
}

export function getTokenFromRequest(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)
  return match?.[1] ?? null
}

