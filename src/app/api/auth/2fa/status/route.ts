import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { successResponse, errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

/**
 * GET /api/auth/2fa/status
 * Return the current 2FA status for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success || !auth.userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || '未授权', 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { twoFactorEnabled: true },
    })

    if (!user) {
      return errorResponse(ErrorCodes.NOT_FOUND, '用户不存在', 404)
    }

    return successResponse({ enabled: user.twoFactorEnabled })
  } catch (error) {
    return handleApiError(error)
  }
}
