import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from './cron-auth'
import { dispatchCronJob, type CronJobType } from './cron-queue'
import { dispatchImapCheck } from './imap-queue'

export async function handleCronRoute(req: NextRequest, type: CronJobType) {
  try {
    const unauthorized = verifyCronSecret(req)
    if (unauthorized) return unauthorized

    if (type === 'check-replies') {
      const { queued, jobId, result } = await dispatchImapCheck()
      return NextResponse.json({
        success: true,
        queued,
        jobId,
        message: queued ? 'IMAP check job queued' : 'IMAP check completed inline',
        data: result,
      })
    }

    const { queued, jobId, result } = await dispatchCronJob(type)
    return NextResponse.json({
      success: true,
      queued,
      jobId,
      message: queued ? `${type} job queued` : `${type} completed inline`,
      data: result,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error(`[Cron] ${type} failed:`, error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
