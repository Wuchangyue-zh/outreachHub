import { prisma } from './prisma'

export type EmailLogStatRow = {
  status: string
  sentAt?: Date | null
  openedAt?: Date | null
  clickedAt?: Date | null
  repliedAt?: Date | null
}

const SENT_STATUSES = ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'] as const
const OPENED_STATUSES = ['OPENED', 'CLICKED', 'REPLIED'] as const
const CLICKED_STATUSES = ['CLICKED', 'REPLIED'] as const

/** 从 EmailLog 行聚合 Campaign 统计（单一数据源） */
export function aggregateCampaignStatsFromLogs(emailLogs: EmailLogStatRow[]) {
  return {
    totalSent: emailLogs.filter((l) => SENT_STATUSES.includes(l.status as typeof SENT_STATUSES[number])).length,
    totalOpened: emailLogs.filter((l) => OPENED_STATUSES.includes(l.status as typeof OPENED_STATUSES[number])).length,
    totalClicked: emailLogs.filter((l) => CLICKED_STATUSES.includes(l.status as typeof CLICKED_STATUSES[number])).length,
    totalReplied: emailLogs.filter((l) => l.status === 'REPLIED').length,
    totalBounced: emailLogs.filter((l) => l.status === 'BOUNCED').length,
  }
}

/** 聚合并回写 Campaign 模型缓存字段 */
export async function syncCampaignStatsFromLogs(
  campaignId: string,
  emailLogs: EmailLogStatRow[]
): Promise<void> {
  const stats = aggregateCampaignStatsFromLogs(emailLogs)
  await prisma.campaign
    .update({
      where: { id: campaignId },
      data: stats,
    })
    .catch((err) => console.error(`[stats] Failed to sync campaign ${campaignId}:`, err))
}

/** 批量同步（Campaign 列表等场景） */
export async function syncCampaignStatsByIds(campaignIds: string[]): Promise<void> {
  if (campaignIds.length === 0) return

  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: campaignIds } },
    include: {
      emailLogs: {
        select: {
          status: true,
          sentAt: true,
          openedAt: true,
          clickedAt: true,
          repliedAt: true,
        },
      },
    },
  })

  await Promise.all(
    campaigns
      .filter((c) => c.emailLogs.length > 0)
      .map((c) => syncCampaignStatsFromLogs(c.id, c.emailLogs))
  )
}
