import { Queue } from 'bullmq'
import { redisConnection } from './redis'

export interface EmailJobData {
  to: string
  subject: string
  html?: string
  text?: string
  contactId?: string
  campaignId?: string
  fromEmail?: string
  fromName?: string
  replyTo?: string
  trackingPixel?: string
  trackingLinks?: boolean
}

export const emailQueue = new Queue<EmailJobData>('email-queue', {
  connection: redisConnection,
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

export async function addEmailJob(data: EmailJobData, options?: { delay?: number; priority?: number }) {
  const job = await emailQueue.add('send-email', data, {
    delay: options?.delay,
    priority: options?.priority,
  })
  return job.id
}

export async function addBulkEmailJobs(emails: EmailJobData[], options?: { delay?: number }) {
  const jobs = await emailQueue.addBulk(
    emails.map((email) => ({
      name: 'send-email',
      data: email,
      opts: {
        delay: options?.delay,
      },
    }))
  )
  return jobs.map((job) => job.id)
}

export async function getEmailJobStatus(jobId: string) {
  const job = await emailQueue.getJob(jobId)
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
}

export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ])

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  }
}

export async function retryFailedJobs() {
  const failedJobs = await emailQueue.getFailed()
  const retryPromises = failedJobs.map((job) => job.retry())
  await Promise.all(retryPromises)
  return failedJobs.length
}

export async function cleanOldJobs(age: number = 24 * 3600 * 1000) {
  const [completed, failed] = await Promise.all([
    emailQueue.clean(age, 1000, 'completed'),
    emailQueue.clean(age, 1000, 'failed'),
  ])
  return {
    cleanedCompleted: completed.length,
    cleanedFailed: failed.length,
  }
}
