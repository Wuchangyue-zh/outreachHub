import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { generateToken } from '@/lib/jwt'
import { rateLimit } from '@/lib/rate-limit'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

export async function POST(req: NextRequest) {
  // Rate limiting: 3 requests per minute
  const rateLimitResult = limiter.check(req, 3)
  if (rateLimitResult) return rateLimitResult

  try {
    const body = await req.json()
    const { email, password, name, company } = body

    if (!email || !password) {
      return errorResponse(
        ErrorCodes.MISSING_REQUIRED_FIELD,
        '邮箱和密码为必填项',
        400
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return errorResponse(
        ErrorCodes.ALREADY_EXISTS,
        '该邮箱已注册',
        409
      )
    }

    const passwordHash = await hashPassword(password)

    // Create tenant for the new user
    const tenant = await prisma.tenant.create({
      data: {
        name: company || `${name || email}的企业`,
        plan: 'FREE',
        maxUsers: 1,
        maxContacts: 1000,
        maxEmailsPerDay: 50,
      },
    })

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash,
        role: 'ADMIN',
        tenantId: tenant.id,
      },
    })

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
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
