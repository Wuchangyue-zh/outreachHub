import { prisma } from './prisma'

const TERMINAL_STATUSES = [
  'SENT',
  'DELIVERED',
  'OPENED',
  'CLICKED',
  'REPLIED',
  'FAILED',
  'BOUNCED',
] as const

const SUCCESS_STATUSES = [
  'SENT',
  'DELIVERED',
  'OPENED',
  'CLICKED',
  'REPLIED',
] as const

/**
 * 当单次/定时 Campaign 的所有联系人均已处理（成功或失败）时，自动标记为 COMPLETED 或 FAILED。
 * RECURRING 活动保持 RUNNING，由 cron 继续调度。
 */
export async function maybeMarkCampaignCompleted(campaignId: string): Promise<boolean> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      scheduleType: true,
      contactIds: true,
    },
  })

  if (!campaign) return false
  if (campaign.status !== 'RUNNING') return false
  if (campaign.scheduleType === 'RECURRING') return false
  if (!campaign.contactIds?.length) return false

  const logs = await prisma.emailLog.findMany({
    where: {
      campaignId,
      contactId: { in: campaign.contactIds },
      status: { in: [...TERMINAL_STATUSES] },
    },
    select: { contactId: true, status: true },
  })

  const processedByContact = new Map<string, string>()
  for (const log of logs) {
    if (!log.contactId) continue
    processedByContact.set(log.contactId, log.status)
  }

  if (processedByContact.size < campaign.contactIds.length) {
    return false
  }

  const hasSuccess = [...processedByContact.values()].some((s) =>
    (SUCCESS_STATUSES as readonly string[]).includes(s)
  )

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: hasSuccess ? 'COMPLETED' : 'FAILED',
      completedAt: new Date(),
    },
  })

  console.log(
    `[Campaign] ${campaignId} marked ${hasSuccess ? 'COMPLETED' : 'FAILED'} (${processedByContact.size}/${campaign.contactIds.length} contacts processed)`
  )

  return true
}

/** 批量修正仍显示 RUNNING 但已全部发完的活动（列表页刷新时调用） */
export async function refreshRunningCampaignStatuses(campaignIds: string[]): Promise<void> {
  await Promise.all(campaignIds.map((id) => maybeMarkCampaignCompleted(id)))
}
