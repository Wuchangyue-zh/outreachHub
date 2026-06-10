/**
 * I5: 自动重试失败的邮件队列任务
 * 每 30 分钟执行一次，重试最近 1 小时内失败的任务（最多 20 个）
 */
import { retryFailedJobs } from '../email-queue'

export async function executeRetryFailed(): Promise<{ retried: number }> {
  const count = await retryFailedJobs({ limit: 20, maxAgeMs: 60 * 60 * 1000 })
  if (count > 0) {
    console.log(`[Cron] Retried ${count} failed email jobs`)
  }
  return { retried: count }
}
