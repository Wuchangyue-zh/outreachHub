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
