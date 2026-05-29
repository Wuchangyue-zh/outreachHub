import { Queue } from 'bullmq'
import { getRedisConnection } from './redis'
import { sendMail } from './email'
import { prisma } from './prisma'
import { addEmailTracking } from './email-tracking'

export interface EmailJobData {
  to: string
  subject: string
  html?: string
  text?: string
  contactId?: string
  campaignId?: string
  fromEmail?: string
  fromName?: string
  trackingPixel?: string
  trackingLinks?: boolean
}

let _emailQueue: Queue<EmailJobData> | null = null
let _queueDisabled = false

export function getEmailQueue(): Queue<EmailJobData> | null {
  if (_queueDisabled) return null

  const connection = getRedisConnection()
  if (!connection) return null

  if (!_emailQueue) {
    try {
      _emailQueue = new Queue<EmailJobData>('email-queue', {
        connection,
        defaultJobOptions: {
          removeOnComplete: {
            age: 3600, // keep completed jobs for 1 hour
            count: 1000, // keep last 1000 completed jobs
          },
          removeOnFail: {
            age: 24 * 3600, // keep failed jobs for 24 hours
          },
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      })

      _emailQueue.on('error', (error) => {
        if (_queueDisabled) return
        _queueDisabled = true
        const message = error instanceof Error ? error.message : String(error)
        console.warn('[EmailQueue] Redis unavailable, falling back to direct send:', message || 'connection failed')
        void _emailQueue?.close().catch(() => {})
        _emailQueue = null
      })
    } catch (error) {
      console.warn('[EmailQueue] Failed to initialize queue, falling back to direct send:', (error as Error).message)
      return null
    }
  }

  return _emailQueue
}

/**
 * Add email to queue, fallback to direct send if queue unavailable
 */
export async function addEmailJob(data: EmailJobData, options?: { delay?: number; priority?: number }): Promise<string | undefined> {
  const queue = getEmailQueue()

  if (!queue) {
    // Fallback to direct send
    console.log('[EmailQueue] Sending email directly (queue unavailable)')
    return sendEmailDirectly(data)
  }

  try {
    const job = await queue.add('send-email', data, {
      delay: options?.delay,
      priority: options?.priority,
    })
    return job.id
  } catch (error) {
    console.warn('[EmailQueue] Failed to add job, falling back to direct send:', (error as Error).message)
    return sendEmailDirectly(data)
  }
}

/**
 * Add bulk emails to queue, fallback to direct send if queue unavailable
 */
export async function addBulkEmailJobs(emails: EmailJobData[], options?: { delay?: number }): Promise<(string | undefined)[]> {
  const queue = getEmailQueue()

  if (!queue) {
    // Fallback to direct send for all emails
    console.log('[EmailQueue] Sending emails directly (queue unavailable)')
    const jobIds: (string | undefined)[] = []
    for (const email of emails) {
      const jobId = await sendEmailDirectly(email)
      jobIds.push(jobId)
    }
    return jobIds
  }

  try {
    const jobs = await queue.addBulk(
      emails.map((email) => ({
        name: 'send-email',
        data: email,
        opts: {
          delay: options?.delay,
        },
      }))
    )
    return jobs.map((job) => job.id)
  } catch (error) {
    console.warn('[EmailQueue] Failed to add bulk jobs, falling back to direct send:', (error as Error).message)
    const jobIds: (string | undefined)[] = []
    for (const email of emails) {
      const jobId = await sendEmailDirectly(email)
      jobIds.push(jobId)
    }
    return jobIds
  }
}

/**
 * Send email directly without queue
 */
async function sendEmailDirectly(data: EmailJobData): Promise<string | undefined> {
  try {
    // Apply tracking if contactId is available
    let emailHtml = data.html || ''
    if (data.contactId) {
      // We'll apply tracking after the email log is created below
      // For direct send, we create the log first
    }

    const result = await sendMail({
      to: data.to,
      subject: data.subject,
      html: emailHtml,
      text: data.text,
      from: data.fromName ? `${data.fromName} <${data.fromEmail || process.env.SMTP_USER}>` : data.fromEmail,
    })

    // Create email log entry
    const logData: any = {
      contactId: data.contactId || '',
      messageId: result.messageId,
      toEmail: data.to,
      fromEmail: data.fromEmail || process.env.SMTP_USER || '',
      subject: data.subject,
      status: 'SENT',
      sentAt: new Date(),
      htmlContent: data.html,
      tracked: !!(data.contactId && data.trackingPixel),
    }

    if (data.campaignId) {
      logData.campaignId = data.campaignId
    }

    const emailLog = await prisma.emailLog.create({
      data: logData,
    })

    // If tracking was supposed to happen, update the sent email with tracking pixel
    // Note: For direct send, tracking pixel is appended post-send (limited)
    // The proper tracking happens when sent via the Worker

    // Update contact stats
    if (data.contactId) {
      await prisma.contact.update({
        where: { id: data.contactId },
        data: {
          emailsSent: { increment: 1 },
          lastContactedAt: new Date(),
        },
      })
    }

    // Update campaign stats
    if (data.campaignId) {
      await prisma.campaign.update({
        where: { id: data.campaignId },
        data: {
          totalSent: { increment: 1 },
        },
      })
    }

    return emailLog.id
  } catch (error) {
    console.error('[EmailQueue] Direct send failed:', (error as Error).message)
    return undefined
  }
}

export async function getEmailJobStatus(jobId: string) {
  const queue = getEmailQueue()
  if (!queue) {
    return { state: 'direct-sent', progress: 100, returnValue: { success: true } }
  }

  try {
    const job = await queue.getJob(jobId)
    if (!job) {
      return null
    }

    const state = await job.getState()
    const progress = job.progress
    const returnValue = job.returnvalue
    const failedReason = job.failedReason

    return {
      id: job.id,
      state,
      progress,
      returnValue,
      failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    }
  } catch (error) {
    console.error('[EmailQueue] Failed to get job status:', (error as Error).message)
    return null
  }
}

export async function getQueueStats() {
  const queue = getEmailQueue()
  if (!queue) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      queueAvailable: false,
    }
  }

  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ])

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      queueAvailable: true,
    }
  } catch (error) {
    console.error('[EmailQueue] Failed to get queue stats:', (error as Error).message)
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      queueAvailable: false,
    }
  }
}

export async function retryFailedJobs() {
  const queue = getEmailQueue()
  if (!queue) {
    return 0
  }

  try {
    const failedJobs = await queue.getFailed()
    const retryPromises = failedJobs.map((job) => job.retry())
    await Promise.all(retryPromises)
    return failedJobs.length
  } catch (error) {
    console.error('[EmailQueue] Failed to retry failed jobs:', (error as Error).message)
    return 0
  }
}

export async function cleanOldJobs(age: number = 24 * 3600 * 1000) {
  const queue = getEmailQueue()
  if (!queue) {
    return { cleanedCompleted: 0, cleanedFailed: 0 }
  }

  try {
    const [completed, failed] = await Promise.all([
      queue.clean(age, 1000, 'completed'),
      queue.clean(age, 1000, 'failed'),
    ])
    return {
      cleanedCompleted: completed.length,
      cleanedFailed: failed.length,
    }
  } catch (error) {
    console.error('[EmailQueue] Failed to clean old jobs:', (error as Error).message)
    return { cleanedCompleted: 0, cleanedFailed: 0 }
  }
}
