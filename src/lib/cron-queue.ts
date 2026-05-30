/**
 * Cron 任务队列（BullMQ queue: cron-jobs）
 *
 * - HTTP 入口：/api/cron/* → dispatchCronJob() 仅入队
 * - 业务逻辑：src/lib/cron-jobs/*.ts（禁止写在 route 里）
 * - 消费者：npm run worker:cron → src/lib/cron-worker.ts
 * - 架构规则：见 CLAUDE.md
 */
export type CronJobType =
  | 'launch-scheduled'
  | 'check-replies'
  | 'advance-sequences'
  | 'ab-test-winner'
  | 'process-follow-ups'
  | 'process-prospecting'

export interface CronJobData {
  type: CronJobType
  triggeredAt: number
}

import { Queue } from 'bullmq'
import { getRedisConnection } from './redis'

let _cronQueue: Queue<CronJobData> | null = null

export function getCronQueue(): Queue<CronJobData> | null {
  const connection = getRedisConnection()
  if (!connection) return null

  if (!_cronQueue) {
    _cronQueue = new Queue<CronJobData>('cron-jobs', {
      connection,
      defaultJobOptions: {
        removeOnComplete: { age: 3600, count: 200 },
        removeOnFail: { age: 86400 },
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 },
      },
    })
  }
  return _cronQueue
}

export async function dispatchCronJob(type: CronJobType): Promise<{ queued: boolean; jobId?: string; result?: unknown }> {
  const queue = getCronQueue()

  if (queue) {
    const job = await queue.add(type, { type, triggeredAt: Date.now() }, {
      jobId: `${type}-${Date.now()}`,
    })
    return { queued: true, jobId: job.id }
  }

  const { runCronHandler } = await import('./cron-handlers')
  const result = await runCronHandler(type)
  return { queued: false, result }
}

export async function getCronQueueStats() {
  const queue = getCronQueue()
  if (!queue) return { queueAvailable: false, waiting: 0, active: 0, failed: 0 }

  const [waiting, active, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getFailedCount(),
  ])
  return { queueAvailable: true, waiting, active, failed }
}
