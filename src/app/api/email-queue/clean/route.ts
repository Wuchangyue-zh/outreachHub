import { NextRequest, NextResponse } from 'next/server'
import { cleanOldJobs } from '@/lib/email-queue'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuthToken(req)
    if (!authResult.success) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, authResult.error || 'Unauthorized', 401)
    }

    const { age } = await req.json().catch(() => ({}))
    const result = await cleanOldJobs(age || 24 * 3600 * 1000)

    return NextResponse.json({
      success: true,
      data: {
        cleanedCompleted: result.cleanedCompleted,
        cleanedFailed: result.cleanedFailed,
        message: `Cleaned ${result.cleanedCompleted + result.cleanedFailed} old job(s)`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
