import { NextRequest, NextResponse } from 'next/server'
import { retryFailedJobs } from '@/lib/email-queue'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuthToken(req)
    if (!authResult.success) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, authResult.error || 'Unauthorized', 401)
    }
    if (!hasPermission(authResult.role, 'campaigns:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要营销管理权限', 403)
    }

    const retried = await retryFailedJobs()

    return NextResponse.json({
      success: true,
      data: {
        retriedCount: retried,
        message: `Retried ${retried} failed job(s)`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
