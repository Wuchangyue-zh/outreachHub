import { NextRequest, NextResponse } from 'next/server'
import { getEmailQueue } from '@/lib/email-queue'
import { handleApiError, errorResponse, ErrorCodes } from '@/lib/api-errors'
import { verifyAuthToken } from '@/lib/auth-middleware'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const authResult = await verifyAuthToken(req)
    if (!authResult.success) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, authResult.error || 'Unauthorized', 401)
    }

    const { jobId } = await params

    if (!jobId) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'jobId is required', 400)
    }

    const queue = getEmailQueue()
    if (!queue) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Email queue not available', 500)
    }

    const job = await queue.getJob(jobId)

    if (!job) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Job not found', 404)
    }

    const state = await job.getState()
    const progress = job.progress
    const returnValue = job.returnvalue
    const failedReason = job.failedReason
    const stacktrace = job.stacktrace

    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        name: job.name,
        state,
        progress,
        returnValue,
        failedReason,
        stacktrace,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        attemptsMade: job.attemptsMade,
        opts: job.opts,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const authResult = await verifyAuthToken(req)
    if (!authResult.success) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, authResult.error || 'Unauthorized', 401)
    }

    const { jobId } = await params

    if (!jobId) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'jobId is required', 400)
    }

    const queue = getEmailQueue()
    if (!queue) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'Email queue not available', 500)
    }

    const job = await queue.getJob(jobId)

    if (!job) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Job not found', 404)
    }

    await job.remove()

    return NextResponse.json({
      success: true,
      data: {
        message: 'Job removed successfully',
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
