import { NextRequest, NextResponse } from 'next/server'
import { addEmailJob, addBulkEmailJobs, getQueueStats, getFailedJobs } from '@/lib/email-queue'
import { handleApiError, errorResponse, ErrorCodes } from '@/lib/api-errors'
import { verifyAuthToken } from '@/lib/auth-middleware'

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuthToken(req)
    if (!authResult.success) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, authResult.error || 'Unauthorized', 401)
    }

    const body = await req.json()
    const { emails, delay, priority } = body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'emails array is required and must not be empty',
        400
      )
    }

    // Validate email format
    for (const email of emails) {
      if (!email.to || !email.subject) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Each email must have "to" and "subject" fields',
          400
        )
      }
    }

    let jobIds: (string | undefined)[]

    if (emails.length === 1) {
      // Single email
      const jobId = await addEmailJob(emails[0], { delay, priority })
      jobIds = [jobId]
    } else {
      // Bulk emails
      jobIds = await addBulkEmailJobs(emails, { delay })
    }

    return NextResponse.json({
      success: true,
      data: {
        jobIds,
        count: jobIds.length,
        message: `Successfully queued ${jobIds.length} email(s)`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuthToken(req)
    if (!authResult.success) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, authResult.error || 'Unauthorized', 401)
    }

    const stats = await getQueueStats()
    const failedJobs = stats.failed > 0 ? await getFailedJobs(20) : []

    return NextResponse.json({
      success: true,
      data: { ...stats, failedJobs },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
