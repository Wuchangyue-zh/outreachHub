import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { encrypt, decrypt } from '@/lib/encryption'

function sanitizeEmailAccount<T extends { smtpPassword?: string | null; imapPassword?: string | null }>(
  account: T
) {
  return {
    ...account,
    smtpPassword: account.smtpPassword ? '********' : '',
    imapPassword: account.imapPassword ? '********' : '',
  }
}

// GET /api/email-accounts — list user's email accounts
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)

    const accounts = await prisma.emailAccount.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({
      success: true,
      data: accounts.map(sanitizeEmailAccount),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/email-accounts — create new email account
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)

    const body = await req.json()
    const { email, displayName, smtpHost, smtpPort, smtpUser, smtpPassword, imapHost, imapPort, imapUser, imapPassword } = body

    if (!email || !smtpHost || !smtpUser || !smtpPassword) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '缺少必要字段: email, smtpHost, smtpUser, smtpPassword', 400)
    }

    const account = await prisma.emailAccount.create({
      data: {
        userId: auth.userId!,
        email,
        displayName: displayName || email.split('@')[0],
        smtpHost,
        smtpPort: parseInt(smtpPort) || 587,
        smtpUser,
        smtpPassword: encrypt(smtpPassword), // P1-4: 加密存储
        imapHost: imapHost || null,
        imapPort: imapPort ? parseInt(imapPort) : null,
        imapUser: imapUser || null,
        imapPassword: imapPassword ? encrypt(imapPassword) : null, // P1-4: 加密存储
      },
    })
    return NextResponse.json({ success: true, data: sanitizeEmailAccount(account) }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
