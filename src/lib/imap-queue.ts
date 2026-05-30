import { Queue, Worker } from 'bullmq'
import { getRedisConnection } from './redis'
import { executeCheckReplies } from './imap-worker-handler'

export interface ImapJobData {
  triggeredAt: number
  userId?: string
}

let _imapQueue: Queue<ImapJobData> | null = null

export function getImapQueue(): Queue<ImapJobData> | null {
  const connection = getRedisConnection()
  if (!connection) return null

  if (!_imapQueue) {
    _imapQueue = new Queue<ImapJobData>('imap-jobs', {
      connection,
      defaultJobOptions: {
        removeOnComplete: { age: 3600, count: 100 },
        removeOnFail: { age: 86400 },
        attempts: 2,
        backoff: { type: 'fixed', delay: 10000 },
      },
    })
  }
  return _imapQueue
}

export async function dispatchImapCheck(userId?: string): Promise<{ queued: boolean; jobId?: string; result?: unknown }> {
  const queue = getImapQueue()

  if (queue) {
    const job = await queue.add('check-replies', { triggeredAt: Date.now(), userId }, {
      jobId: `imap-check-${Date.now()}`,
    })
    return { queued: true, jobId: job.id }
  }

  const result = await executeCheckReplies(userId)
  return { queued: false, result }
}

export function createImapWorker() {
  const connection = getRedisConnection()
  if (!connection) {
    throw new Error('Redis is not configured. Set REDIS_URL to run the IMAP worker.')
  }

  const worker = new Worker<ImapJobData>(
    'imap-jobs',
    async (job) => executeCheckReplies(job.data.userId),
    { connection, concurrency: 1 }
  )

  worker.on('failed', (job, err) => {
    console.error(`[IMAP Worker] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
