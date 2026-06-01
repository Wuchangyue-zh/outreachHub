import jwt from 'jsonwebtoken'
import { getJwtSecret } from './env'

export interface JWTPayload {
  userId: string
  email: string
  tenantId?: string
  role: string
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload
  } catch {
    return null
  }
}

// 2FA temporary token (Batch S)
export interface TwoFATempPayload {
  userId: string
  purpose: '2fa'
}

export function generate2FAToken(userId: string): string {
  return jwt.sign({ userId, purpose: '2fa' } as TwoFATempPayload, getJwtSecret(), { expiresIn: '5m' })
}

export function verify2FAToken(token: string): TwoFATempPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as TwoFATempPayload
    if (payload.purpose !== '2fa') return null
    return payload
  } catch {
    return null
  }
}
