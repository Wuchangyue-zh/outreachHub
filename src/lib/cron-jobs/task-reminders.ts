/**
 * Cron: 任务提醒处理
 *
 * 查找已到期或需要提醒的任务，更新关联联系人的 lastActivityAt。
 * 每 15 分钟执行一次。
 */
import { prisma } from '../prisma'

export async function executeTaskReminders(): Promise<{
  processed: number
  reminded: number
  results: Array<{ taskId: string; contactId: string | null; action: string }>
}> {
  const now = new Date()

  // 查找需要提醒的任务：状态为 PENDING 或 RUNNING，且 reminderAt <= 当前时间
  const tasks = await prisma.task.findMany({
    where: {
      status: { in: ['PENDING', 'RUNNING'] },
      reminderAt: { lte: now },
      tenantId: { not: null },
    },
    include: {
      tenant: true,
      contact: true,
    },
  })

  const results: Array<{ taskId: string; contactId: string | null; action: string }> = []

  for (const task of tasks) {
    // 更新关联联系人的 lastActivityAt
    if (task.contactId) {
      await prisma.contact.update({
        where: { id: task.contactId },
        data: { lastActivityAt: now },
      }).catch(() => {
        // 联系人可能已被删除，忽略错误
      })

      results.push({
        taskId: task.id,
        contactId: task.contactId,
        action: 'contact-activity-updated',
      })
    } else {
      results.push({
        taskId: task.id,
        contactId: null,
        action: 'no-contact-linked',
      })
    }
  }

  return {
    processed: tasks.length,
    reminded: results.filter(r => r.action === 'contact-activity-updated').length,
    results,
  }
}
