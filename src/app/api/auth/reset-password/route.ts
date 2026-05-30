import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!token || !password) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '缺少重置令牌或新密码', 400)
    }

    if (password.length < 6) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '密码至少 6 位', 400)
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    })

    if (!user) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '重置链接无效或已过期，请重新申请', 400)
    }

    const passwordHash = await hashPassword(password)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: '密码已重置，请使用新密码登录',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
