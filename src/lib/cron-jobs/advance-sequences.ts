import { prisma } from '@/lib/prisma'
import { addBulkEmailJobs } from '@/lib/email-queue'
import { applyEmailVariables, buildContactVariables } from '@/lib/email-variables'
import { getAvailableAccount } from '@/lib/select-email-account'
import { getCampaignContactIds } from '@/lib/campaign-contacts'

export async function executeAdvanceSequences() {
  const campaigns = await prisma.campaign.findMany({
    where: { type: 'SEQUENCE', status: 'RUNNING' },
  })

  if (campaigns.length === 0) {
    return { processed: 0, message: '没有进行中的序列活动', results: [] }
  }

  const results: Array<{ campaignId: string; action: string; details?: string }> = []

  for (const campaign of campaigns) {
    const steps = (campaign.sequence as any[]) || []
    if (steps.length === 0) {
      results.push({ campaignId: campaign.id, action: 'skip', details: '无步骤配置' })
      continue
    }

    const contactIds = await getCampaignContactIds(campaign.id)
    if (contactIds.length === 0) {
      results.push({ campaignId: campaign.id, action: 'skip', details: '无联系人' })
      continue
    }

    const logs = await prisma.emailLog.groupBy({
      by: ['contactId'],
      where: {
        campaignId: campaign.id,
        contactId: { in: contactIds },
        status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'] },
      },
      _count: { id: true },
    })

    const completedStepsMap = new Map<string, number>()
    for (const log of logs) {
      completedStepsMap.set(log.contactId, log._count.id)
    }

    let minCompletedSteps = steps.length
    for (const cid of contactIds) {
      const count = completedStepsMap.get(cid) || 0
      if (count < minCompletedSteps) minCompletedSteps = count
    }

    if (minCompletedSteps >= steps.length) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
      results.push({ campaignId: campaign.id, action: 'completed', details: `全部 ${steps.length} 步已完成` })
      continue
    }

    const currentStepIndex = minCompletedSteps
    const currentStep = steps[currentStepIndex]

    if (currentStepIndex > 0 && currentStep.delayHours > 0) {
      const lastLogOfPrevStep = await prisma.emailLog.findFirst({
        where: {
          campaignId: campaign.id,
          contactId: { in: contactIds },
          status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'] },
        },
        orderBy: { sentAt: 'desc' },
        select: { sentAt: true },
      })

      if (lastLogOfPrevStep?.sentAt) {
        const elapsedHours = (Date.now() - lastLogOfPrevStep.sentAt.getTime()) / (1000 * 60 * 60)
        if (elapsedHours < currentStep.delayHours) {
          results.push({
            campaignId: campaign.id,
            action: 'waiting',
            details: `步骤 ${currentStepIndex + 1} 延迟中 (${elapsedHours.toFixed(1)}/${currentStep.delayHours}h)`,
          })
          continue
        }
      }
    }

    const contactsToAdvance = contactIds.filter((cid) => {
      const count = completedStepsMap.get(cid) || 0
      return count === currentStepIndex
    })

    if (contactsToAdvance.length === 0) {
      results.push({ campaignId: campaign.id, action: 'skip', details: `步骤 ${currentStepIndex + 1} 无待发送联系人` })
      continue
    }

    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactsToAdvance }, tenantId: campaign.tenantId! },
      include: {
        company: true,
        emails: { where: { isPrimary: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    const userId = await prisma.user.findFirst({
      where: { tenantId: campaign.tenantId! },
      select: { id: true },
    })
    const availableAccountId = userId
      ? await getAvailableAccount(userId.id, campaign.emailAccountId)
      : null

    if (!availableAccountId) {
      results.push({ campaignId: campaign.id, action: 'error', details: '无可用发件账户' })
      continue
    }

    const emailJobs = contacts
      .map((contact) => {
        const primaryEmail = contact.emails[0]
        if (!primaryEmail) return null
        const vars = buildContactVariables(contact, primaryEmail.address)
        const rawHtml = currentStep.htmlContent || currentStep.content || ''
        return {
          to: primaryEmail.address,
          subject: applyEmailVariables(currentStep.subject || campaign.subject, vars),
          html: applyEmailVariables(rawHtml, vars),
          text: applyEmailVariables(currentStep.content || '', vars),
          contactId: contact.id,
          campaignId: campaign.id,
          emailAccountId: availableAccountId,
          fromEmail: campaign.fromEmail || process.env.SMTP_USER || '',
          fromName: campaign.fromName || '',
          trackingPixel: true,
          trackingLinks: true,
        }
      })
      .filter(Boolean)

    if (emailJobs.length > 0) {
      await addBulkEmailJobs(emailJobs as any[])
      results.push({
        campaignId: campaign.id,
        action: 'advanced',
        details: `步骤 ${currentStepIndex + 1}/${steps.length} 发送 ${emailJobs.length} 封`,
      })
    }
  }

  return { processed: campaigns.length, results }
}
