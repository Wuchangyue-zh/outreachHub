import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { verifyTOTP, generateBackupCodes, hashBackupCodes } from '@/lib/two-factor'
import { writeAuditLog } from '@/lib/audit'
import { successResponse, errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

/**
 * POST /api/auth/2fa/verify
 * Verify a TOTP code and enable 2FA for the user.
 * Returns plaintext backup codes (shown once).
 */
export async function POST(req: NextRequest) {
  const rateLimitResult = await limiter.check(req, 10)
  if (rateLimitResult) return rateLimitResult

  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success || !auth.userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || '未授权', 401)
    }

    const body = await req.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '验证码为必填项', 400)
    }

    const user = await prisma.user.findUnique({ where: { id: auth.userId } })
    if (!user) {
      return errorResponse(ErrorCodes.NOT_FOUND, '用户不存在', 404)
    }

    if (user.twoFactorEnabled) {
      return errorResponse(ErrorCodes.CONFLICT, '两步验证已启用', 409)
    }

    if (!user.twoFactorSecret) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '请先请求启用两步验证', 400)
    }

    const isValid = verifyTOTP(code.trim(), user.twoFactorSecret)
    if (!isValid) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '验证码无效', 400)
    }

    // Generate backup codes
    const plainCodes = generateBackupCodes(8)
    const hashedCodes = await hashBackupCodes(plainCodes)

    // Enable 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(hashedCodes),
      },
    })

    // Audit log
    await writeAuditLog({
      userId: user.id,
      tenantId: user.tenantId || undefined,
      action: 'enable_2fa',
      resource: 'user',
      resourceId: user.id,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    })

    return successResponse({
      backupCodes: plainCodes,
    }, '两步验证已启用')
  } catch (error) {
    return handleApiError(error)
  }
}
