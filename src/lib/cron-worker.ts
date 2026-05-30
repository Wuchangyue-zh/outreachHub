import { Worker } from 'bullmq'
import { getRedisConnection } from './redis'
import type { CronJobData } from './cron-queue'
import { runCronHandler } from './cron-handlers'

export function createCronWorker() {
  const connection = getRedisConnection()
  if (!connection) {
    throw new Error('Redis is not configured. Set REDIS_URL to run the cron worker.')
  }

  const worker = new Worker<CronJobData>(
    'cron-jobs',
    async (job) => {
      console.log(`[Cron Worker] Processing ${job.data.type}...`)
      const result = await runCronHandler(job.data.type)
      console.log(`[Cron Worker] Completed ${job.data.type}`)
      return result
    },
    {
      connection,
      concurrency: 2,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[Cron Worker] Job ${job?.id} (${job?.data.type}) failed:`, err.message)
  })

  return worker
}
