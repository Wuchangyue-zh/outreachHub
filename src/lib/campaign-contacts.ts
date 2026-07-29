/**
 * Campaign 联系人读写唯一入口。
 *
 * - 优先 CampaignContact 关联表
 * - Campaign.contactIds[] 为遗留兼容，新代码禁止直接依赖
 * - 架构规则：见 CLAUDE.md / docs/architecture.md
 */
import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { AppError, ErrorCodes } from './api-errors'

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
 * 校验 contactIds 均属于当前租户；返回去重后的合法 ID 列表。
 * 任一 ID 不属于租户则抛出 AppError（拒绝跨租户关联）。
 */
export async function assertContactsBelongToTenant(
  tenantId: string,
  contactIds: string[]
): Promise<string[]> {
  const uniqueIds = [...new Set(contactIds.filter(Boolean))]
  if (uniqueIds.length === 0) return []

  const owned = await prisma.contact.findMany({
    where: { tenantId, id: { in: uniqueIds } },
    select: { id: true },
  })

  if (owned.length !== uniqueIds.length) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      '部分联系人不存在或不属于当前租户',
      400
    )
  }

  return uniqueIds
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

async function replaceCampaignContactsWithClient(
  client: Prisma.TransactionClient | typeof prisma,
  campaignId: string,
  contactIds: string[]
): Promise<void> {
  const uniqueIds = [...new Set(contactIds.filter(Boolean))]
  await client.campaignContact.deleteMany({ where: { campaignId } })
  if (uniqueIds.length === 0) return
  await client.campaignContact.createMany({
    data: uniqueIds.map((contactId) => ({
      campaignId,
      contactId,
      status: 'PENDING' as const,
    })),
  })
}

/**
 * 替换 Campaign 的全部联系人关联。
 * 传入 tx 时可嵌入外层事务，避免嵌套事务；未传则自建事务保证原子性。
 */
export async function replaceCampaignContacts(
  campaignId: string,
  contactIds: string[],
  tx?: Prisma.TransactionClient
): Promise<void> {
  if (tx) {
    await replaceCampaignContactsWithClient(tx, campaignId, contactIds)
    return
  }

  await prisma.$transaction(async (inner) => {
    await replaceCampaignContactsWithClient(inner, campaignId, contactIds)
  })
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
