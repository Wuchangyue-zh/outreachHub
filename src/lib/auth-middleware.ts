import { NextRequest } from 'next/server'
import { verifyToken } from './jwt'

export interface AuthResult {
  success: boolean
  userId?: string
  tenantId?: string
  error?: string
}

export async function verifyAuthToken(req: NextRequest): Promise<AuthResult> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.get('authorization')

    if (!authHeader) {
      return {
        success: false,
        error: 'Authorization header is required',
      }
    }

    // Extract token from "Bearer <token>"
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return {
        success: false,
        error: 'Authorization header must be in format: Bearer <token>',
      }
    }

    const token = parts[1]

    // Verify token
    const payload = verifyToken(token)

    if (!payload) {
      return {
        success: false,
        error: 'Invalid or expired token',
      }
    }

    return {
      success: true,
      userId: payload.userId,
      tenantId: payload.tenantId,
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return {
      success: false,
      error: 'Failed to verify authentication token',
    }
  }
}
