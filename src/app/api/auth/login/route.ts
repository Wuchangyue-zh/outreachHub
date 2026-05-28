import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'
import { generateToken } from '@/lib/jwt'
import { rateLimit } from '@/lib/rate-limit'
import { successResponse, errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

export async function POST(req: NextRequest) {
  // Rate limiting: 5 requests per minute
  const rateLimitResult = limiter.check(req, 5)
  if (rateLimitResult) return rateLimitResult

  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return errorResponse(
        ErrorCodes.MISSING_REQUIRED_FIELD,
        '邮箱和密码为必填项',
        400
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    })

    if (!user) {
      return errorResponse(
        ErrorCodes.INVALID_CREDENTIALS,
        '邮箱或密码错误',
        401
      )
    }

    const validPassword = await verifyPassword(password, user.passwordHash)
    if (!validPassword) {
      return errorResponse(
        ErrorCodes.INVALID_CREDENTIALS,
        '邮箱或密码错误',
        401
      )
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId || undefined,
      role: user.role,
    })

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    return handleApiError(error)
  }
}
