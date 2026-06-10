import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { generateToken } from '@/lib/jwt'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { getTenantLimits } from '@/lib/plan-limits'

/**
 * POST /api/auth/accept-invite
 * 接受团队邀请（新用户注册 + 加入团队，或已有用户加入团队）
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, password, name } = body

    if (!token) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '缺少邀请令牌', 400)
    }

    // 查找邀请
    const invitation = await prisma.invitation.findFirst({
      where: { token, status: 'PENDING' },
      include: { tenant: { select: { id: true, name: true, maxUsers: true } } },
    })

    if (!invitation) {
      return errorResponse(ErrorCodes.NOT_FOUND, '邀请不存在或已失效', 404)
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      })
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '邀请已过期', 400)
    }

    // 检查用户数限额
    const userCount = await prisma.user.count({ where: { tenantId: invitation.tenantId } })
    const limits = await getTenantLimits(invitation.tenantId)
    if (userCount >= limits.maxUsers) {
      return errorResponse(ErrorCodes.FORBIDDEN, '团队成员已达上限', 403)
    }

    // 检查是否已有该邮箱用户
    let user = await prisma.user.findUnique({ where: { email: invitation.email } })

    if (user) {
      // 已有用户 — 加入团队
      if (user.tenantId === invitation.tenantId) {
        return errorResponse(ErrorCodes.ALREADY_EXISTS, '您已是该团队成员', 409)
      }
      if (user.tenantId) {
        return errorResponse(ErrorCodes.ALREADY_EXISTS, '该用户已属于其他团队', 409)
      }
      user = await prisma.user.update({
        where: { id: user.id },
        data: { tenantId: invitation.tenantId, role: invitation.role as any },
      })
    } else {
      // 新用户 — 注册并加入团队
      if (!password) {
        return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '请设置密码', 400)
      }
      const passwordHash = await hashPassword(password)
      user = await prisma.user.create({
        data: {
          email: invitation.email,
          name: name || invitation.email.split('@')[0],
          passwordHash,
          role: invitation.role as any,
          tenantId: invitation.tenantId,
        },
      })
    }

    // 标记邀请为已接受
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    })

    // 生成 JWT
    const jwtToken = generateToken({
      userId: user.id,
      email: user.email,
      tenantId: invitation.tenantId,
      role: user.role,
    })

    const response = NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        tenant: { id: invitation.tenant.id, name: invitation.tenant.name },
      },
    })

    response.cookies.set('auth-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    return handleApiError(error)
  }
}
