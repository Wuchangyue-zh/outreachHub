/**
 * Campaign 联系人读写唯一入口。
 *
 * - 优先 CampaignContact 关联表
 * - Campaign.contactIds[] 为遗留兼容，新代码禁止直接依赖
 * - 架构规则：见 CLAUDE.md / docs/architecture.md
 */
import { prisma } from './prisma'
export async function getCampaignContactIds(campaignId: string): Promise<string[]> {
  const rows = await prisma.campaignContact.findMany({
    where: { campaignId },
    select: { contactId: true },
    orderBy: { createdAt: 'asc' },
  })

  if (rows.length > 0) {
    return rows.map((r) => r.contactId)
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { contactIds: true },
  })

  return campaign?.contactIds || []
}

/**
 * 同步 contactIds 到 CampaignContact 关联表（upsert，不删除已有记录）。
 */
export async function syncCampaignContacts(
  campaignId: string,
  contactIds: string[]
): Promise<void> {
  const uniqueIds = [...new Set(contactIds.filter(Boolean))]
  if (uniqueIds.length === 0) return

  await prisma.$transaction(
    uniqueIds.map((contactId) =>
      prisma.campaignContact.upsert({
        where: { campaignId_contactId: { campaignId, contactId } },
        create: { campaignId, contactId, status: 'PENDING' },
        update: {},
      })
    )
  )
}

/**
 * 替换 Campaign 的全部联系人关联。
 */
export async function replaceCampaignContacts(
  campaignId: string,
  contactIds: string[]
): Promise<void> {
  const uniqueIds = [...new Set(contactIds.filter(Boolean))]

  await prisma.$transaction([
    prisma.campaignContact.deleteMany({ where: { campaignId } }),
    ...uniqueIds.map((contactId) =>
      prisma.campaignContact.create({
        data: { campaignId, contactId, status: 'PENDING' },
      })
    ),
  ])
}

/**
 * 更新单个 CampaignContact 状态。
 */
export async function updateCampaignContactStatus(
  campaignId: string,
  contactId: string,
  status: 'PENDING' | 'SENT' | 'OPENED' | 'REPLIED' | 'BOUNCED' | 'FAILED' | 'SKIPPED'
): Promise<void> {
  await prisma.campaignContact.updateMany({
    where: { campaignId, contactId },
    data: { status },
  })
}
