import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

/**
 * POST /api/inbox/mark-seen
 * Mark inbox as seen (sets User.inboxLastSeenAt = now).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'User required', 401)
    }

    const now = new Date()
    await prisma.user.update({
      where: { id: auth.userId },
      data: { inboxLastSeenAt: now },
    })

    return NextResponse.json({
      success: true,
      data: { inboxLastSeenAt: now.toISOString() },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
