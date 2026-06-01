import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verify2FAToken, generateToken } from '@/lib/jwt'
import { verifyTOTP, verifyBackupCode } from '@/lib/two-factor'
import { writeAuditLog } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

/**
 * POST /api/auth/login/verify-2fa
 * Complete login after 2FA verification.
 * Accepts either a TOTP code or a backup code.
 */
export async function POST(req: NextRequest) {
  const rateLimitResult = await limiter.check(req, 10)
  if (rateLimitResult) return rateLimitResult

  try {
    const body = await req.json()
    const { tempToken, code, backupCode } = body

    if (!tempToken) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '临时令牌为必填项', 400)
    }

    if (!code && !backupCode) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '验证码或备用码为必填项', 400)
    }

    // Verify the temp token
    const payload = verify2FAToken(tempToken)
    if (!payload) {
      return errorResponse(ErrorCodes.TOKEN_INVALID, '临时令牌无效或已过期', 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { tenant: true },
    })

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return errorResponse(ErrorCodes.NOT_FOUND, '用户不存在或两步验证未启用', 404)
    }

    let verified = false
    let usedBackupCode = false
    let matchedBackupIndex = -1

    if (code) {
      // TOTP verification
      verified = verifyTOTP(code.trim(), user.twoFactorSecret)
    } else if (backupCode && user.twoFactorBackupCodes) {
      // Backup code verification
      const hashedCodes: string[] = JSON.parse(user.twoFactorBackupCodes)
      matchedBackupIndex = await verifyBackupCode(backupCode.trim().toUpperCase(), hashedCodes)
      if (matchedBackupIndex >= 0) {
        verified = true
        usedBackupCode = true
      }
    }

    if (!verified) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '验证码或备用码无效', 400)
    }

    // If a backup code was used, remove it from the stored codes
    if (usedBackupCode && user.twoFactorBackupCodes) {
      const hashedCodes: string[] = JSON.parse(user.twoFactorBackupCodes)
      hashedCodes.splice(matchedBackupIndex, 1)
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorBackupCodes: JSON.stringify(hashedCodes) },
      })
    }

    // Generate full auth token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId || undefined,
      role: user.role,
    })

    // Audit log
    await writeAuditLog({
      userId: user.id,
      tenantId: user.tenantId || undefined,
      action: 'login_2fa',
      resource: 'user',
      resourceId: user.id,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      meta: { method: usedBackupCode ? 'backup_code' : 'totp' },
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
