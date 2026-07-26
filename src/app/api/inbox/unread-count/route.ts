import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, tenantWhere } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

/**
 * GET /api/inbox/unread-count
 * Count EmailLogs with repliedAt after the user's inboxLastSeenAt.
 * If never seen, count replies in the last 7 days.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.userId || !auth.tenantId) {
      return NextResponse.json({ success: true, data: { count: 0 } })
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { inboxLastSeenAt: true },
    })

    const since =
      user?.inboxLastSeenAt ||
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const count = await prisma.emailLog.count({
      where: {
        repliedAt: { gt: since },
        contact: tenantWhere(auth.tenantId),
      },
    })

    return NextResponse.json({
      success: true,
      data: { count, since: since.toISOString() },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
