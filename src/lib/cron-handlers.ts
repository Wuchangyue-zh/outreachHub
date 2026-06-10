import type { CronJobType } from './cron-queue'

export async function runCronHandler(type: CronJobType): Promise<unknown> {
  switch (type) {
    case 'launch-scheduled': {
      const { executeLaunchScheduled } = await import('./cron-jobs/launch-scheduled')
      return executeLaunchScheduled()
    }
    case 'advance-sequences': {
      const { executeAdvanceSequences } = await import('./cron-jobs/advance-sequences')
      return executeAdvanceSequences()
    }
    case 'ab-test-winner': {
      const { executeAbTestWinner } = await import('./cron-jobs/ab-test-winner')
      return executeAbTestWinner()
    }
    case 'process-follow-ups': {
      const { executeProcessFollowUps } = await import('./cron-jobs/process-follow-ups')
      return executeProcessFollowUps()
    }
    case 'process-prospecting': {
      const { executeProcessProspecting } = await import('./cron-jobs/process-prospecting')
      return executeProcessProspecting()
    }
    case 'check-replies': {
      const { executeCheckReplies } = await import('./imap-worker-handler')
      return executeCheckReplies()
    }
    case 'retry-failed': {
      const { executeRetryFailed } = await import('./cron-jobs/retry-failed')
      return executeRetryFailed()
    }
    case 'task-reminders': {
      const { executeTaskReminders } = await import('./cron-jobs/task-reminders')
      return executeTaskReminders()
    }
    default:
      throw new Error(`Unknown cron job type: ${type}`)
  }
}
