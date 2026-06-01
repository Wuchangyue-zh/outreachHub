import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { verifyPassword, hashPassword } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { successResponse, errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

/**
 * POST /api/auth/change-password
 * Change the current user's password after verifying the current one.
 */
export async function POST(req: NextRequest) {
  const rateLimitResult = await limiter.check(req, 5)
  if (rateLimitResult) return rateLimitResult

  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success || !auth.userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || '未授权', 401)
    }

    const body = await req.json()
    const { currentPassword, newPassword } = body as {
      currentPassword?: string
      newPassword?: string
    }

    if (!currentPassword || !newPassword) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '当前密码和新密码为必填项', 400)
    }

    if (newPassword.length < 6) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '新密码至少 6 位', 400)
    }

    const user = await prisma.user.findUnique({ where: { id: auth.userId } })
    if (!user) {
      return errorResponse(ErrorCodes.NOT_FOUND, '用户不存在', 404)
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash)
    if (!isValid) {
      return errorResponse(ErrorCodes.INVALID_CREDENTIALS, '当前密码错误', 401)
    }

    const passwordHash = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    await writeAuditLog({
      userId: user.id,
      tenantId: user.tenantId || undefined,
      action: 'change_password',
      resource: 'user',
      resourceId: user.id,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    })

    return successResponse(null, '密码已修改')
  } catch (error) {
    return handleApiError(error)
  }
}
