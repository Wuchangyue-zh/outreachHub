import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'

export interface JWTPayload {
  userId: string
  email: string
  tenantId?: string
  role: string
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}
