import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { verifyTOTP } from '@/lib/two-factor'
import { safeDecrypt } from '@/lib/encryption'
import { writeAuditLog } from '@/lib/audit'
import { successResponse, errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA after verifying the current TOTP code.
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

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return errorResponse(ErrorCodes.CONFLICT, '两步验证未启用', 409)
    }

    // Decrypt the stored secret (may be encrypted or legacy plaintext)
    const decryptedSecret = safeDecrypt(user.twoFactorSecret)
    const isValid = verifyTOTP(code.trim(), decryptedSecret)
    if (!isValid) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '验证码无效', 400)
    }

    // Disable 2FA and clear secrets
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    })

    // Audit log
    await writeAuditLog({
      userId: user.id,
      tenantId: user.tenantId || undefined,
      action: 'disable_2fa',
      resource: 'user',
      resourceId: user.id,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    })

    return successResponse(null, '两步验证已关闭')
  } catch (error) {
    return handleApiError(error)
  }
}
