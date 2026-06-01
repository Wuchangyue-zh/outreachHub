import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { generateTOTPSecret } from '@/lib/two-factor'
import { successResponse, errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

/**
 * POST /api/auth/2fa/enable
 * Generate a TOTP secret and return the QR code URL.
 * Does NOT enable 2FA yet — the user must verify a code first.
 */
export async function POST(req: NextRequest) {
  const rateLimitResult = await limiter.check(req, 10)
  if (rateLimitResult) return rateLimitResult

  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success || !auth.userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || '未授权', 401)
    }

    const user = await prisma.user.findUnique({ where: { id: auth.userId } })
    if (!user) {
      return errorResponse(ErrorCodes.NOT_FOUND, '用户不存在', 404)
    }

    if (user.twoFactorEnabled) {
      return errorResponse(ErrorCodes.CONFLICT, '两步验证已启用', 409)
    }

    const { secret, otpauthUrl } = generateTOTPSecret(user.email)

    // Store the secret temporarily (not yet enabled)
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret },
    })

    return successResponse({
      secret,
      qrCode: otpauthUrl,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
