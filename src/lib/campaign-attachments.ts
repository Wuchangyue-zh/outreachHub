import { prisma } from './prisma'

/** 查询 Campaign 关联的附件 ID 列表 */
export async function getCampaignAttachmentIds(
  tenantId: string,
  campaignId: string
): Promise<string[]> {
  const attachments = await prisma.attachment.findMany({
    where: { tenantId, relatedType: 'campaign', relatedId: campaignId },
    select: { id: true },
  })
  return attachments.map((a) => a.id)
}

/** 将已上传附件关联到 Campaign（H1） */
export async function linkAttachmentsToCampaign(
  tenantId: string,
  campaignId: string,
  attachmentIds: string[]
): Promise<void> {
  if (!attachmentIds.length) return
  await prisma.attachment.updateMany({
    where: { id: { in: attachmentIds }, tenantId },
    data: { relatedType: 'campaign', relatedId: campaignId },
  })
}
