import { prisma } from '@/lib/prisma'
import { addBulkEmailJobs } from '@/lib/email-queue'
import { applyEmailVariables, buildContactVariables } from '@/lib/email-variables'
import { getAvailableAccount } from '@/lib/select-email-account'
import { getCampaignContactIds } from '@/lib/campaign-contacts'

function calculateNextRecurrence(recurrenceRule: string, lastRun: Date): Date | null {
  switch (recurrenceRule.toLowerCase()) {
    case 'daily': {
      const next = new Date(lastRun)
      next.setDate(next.getDate() + 1)
      return next
    }
    case 'weekly': {
      const next = new Date(lastRun)
      next.setDate(next.getDate() + 7)
      return next
    }
    case 'biweekly': {
      const next = new Date(lastRun)
      next.setDate(next.getDate() + 14)
      return next
    }
    case 'monthly': {
      const next = new Date(lastRun)
      next.setMonth(next.getMonth() + 1)
      return next
    }
    default:
      return null
  }
}

function shouldExecuteNow(sendingWindows: any): boolean {
  if (!sendingWindows) return true
  try {
    const now = new Date()
    const currentTime = now.getUTCHours() * 60 + now.getUTCMinutes()
    const { start, end } = sendingWindows
    if (!start || !end) return true
    const [startHour, startMinute] = start.split(':').map(Number)
    const [endHour, endMinute] = end.split(':').map(Number)
    const startTime = startHour * 60 + startMinute
    const endTime = endHour * 60 + endMinute
    if (startTime <= endTime) return currentTime >= startTime && currentTime <= endTime
    return currentTime >= startTime || currentTime <= endTime
  } catch {
    return true
  }
}

async function processScheduledCampaign(campaign: any) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: campaign.tenantId! },
      include: { users: { take: 1 } },
    })
    const userId = tenant?.users[0]?.id
    if (!userId) return { campaignId: campaign.id, success: false, error: 'No user found' }

    const availableAccountId = await getAvailableAccount(userId, campaign.emailAccountId)
    if (!availableAccountId) {
      return { campaignId: campaign.id, success: false, error: 'No available email account' }
    }

    const contactIds = await getCampaignContactIds(campaign.id)
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, tenantId: campaign.tenantId! },
      include: {
        company: true,
        emails: { where: { isPrimary: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    if (contacts.length === 0) {
      return { campaignId: campaign.id, success: false, error: 'No valid contacts' }
    }

    const alreadySent = await prisma.emailLog.findMany({
      where: {
        campaignId: campaign.id,
        status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'] },
      },
      select: { contactId: true },
    })
    const sentContactIds = new Set(alreadySent.map((log) => log.contactId))
    const contactSlice = contacts
      .filter((c) => !sentContactIds.has(c.id))
      .slice(0, campaign.throttlePerDay || 200)

    const emailJobs = contactSlice
      .map((contact) => {
        const primaryEmail = contact.emails[0]
        if (!primaryEmail) return null
        const vars = buildContactVariables(contact, primaryEmail.address)
        const rawHtml = campaign.htmlContent || campaign.content || ''
        return {
          to: primaryEmail.address,
          subject: applyEmailVariables(campaign.subject, vars),
          html: applyEmailVariables(rawHtml, vars),
          text: applyEmailVariables(campaign.content || '', vars),
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

    if (emailJobs.length === 0) {
      return { campaignId: campaign.id, success: false, error: 'No emails to send' }
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'RUNNING', sentAt: new Date() },
    })

    const jobIds = await addBulkEmailJobs(emailJobs as any[])
    return { campaignId: campaign.id, success: true, enqueued: emailJobs.length, jobIds }
  } catch (error: any) {
    return { campaignId: campaign.id, success: false, error: error.message }
  }
}

async function processRecurringCampaign(campaign: any) {
  try {
    const now = new Date()
    if (!shouldExecuteNow(campaign.sendingWindows)) {
      return { campaignId: campaign.id, success: true, skipped: true, reason: 'Outside sending window' }
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: campaign.tenantId! },
      include: { users: { take: 1 } },
    })
    const userId = tenant?.users[0]?.id
    if (!userId) return { campaignId: campaign.id, success: false, error: 'No user found' }

    const availableAccountId = await getAvailableAccount(userId, campaign.emailAccountId)
    if (!availableAccountId) {
      return { campaignId: campaign.id, success: false, error: 'No available email account' }
    }

    const contactIds = await getCampaignContactIds(campaign.id)
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, tenantId: campaign.tenantId! },
      include: {
        company: true,
        emails: { where: { isPrimary: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })

    if (contacts.length === 0) {
      return { campaignId: campaign.id, success: false, error: 'No valid contacts' }
    }

    const recentLogs = await prisma.emailLog.findMany({
      where: {
        campaignId: campaign.id,
        createdAt: { gte: campaign.lastRecurrenceAt || new Date(0) },
      },
      select: { contactId: true },
    })
    const recentlySentIds = new Set(recentLogs.map((log) => log.contactId))
    const contactSlice = contacts
      .filter((c) => !recentlySentIds.has(c.id))
      .slice(0, campaign.throttlePerDay || 200)

    const emailJobs = contactSlice
      .map((contact) => {
        const primaryEmail = contact.emails[0]
        if (!primaryEmail) return null
        const vars = buildContactVariables(contact, primaryEmail.address)
        const rawHtml = campaign.htmlContent || campaign.content || ''
        return {
          to: primaryEmail.address,
          subject: applyEmailVariables(campaign.subject, vars),
          html: applyEmailVariables(rawHtml, vars),
          text: applyEmailVariables(campaign.content || '', vars),
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

    const nextRecurrence = calculateNextRecurrence(campaign.recurrenceRule, now)

    if (emailJobs.length === 0) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { lastRecurrenceAt: now, nextRecurrenceAt: nextRecurrence },
      })
      return { campaignId: campaign.id, success: true, enqueued: 0, reason: 'No new emails to send' }
    }

    const jobIds = await addBulkEmailJobs(emailJobs as any[])
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { lastRecurrenceAt: now, nextRecurrenceAt: nextRecurrence },
    })

    return {
      campaignId: campaign.id,
      success: true,
      enqueued: emailJobs.length,
      jobIds,
      nextRecurrence: nextRecurrence?.toISOString(),
    }
  } catch (error: any) {
    return { campaignId: campaign.id, success: false, error: error.message }
  }
}

export async function executeLaunchScheduled() {
  const now = new Date()
  const [scheduledCampaigns, recurringCampaigns] = await Promise.all([
    prisma.campaign.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
    }),
    prisma.campaign.findMany({
      where: {
        status: 'RUNNING',
        scheduleType: 'RECURRING',
        recurrenceRule: { not: null },
        OR: [
          { nextRecurrenceAt: { lte: now } },
          { nextRecurrenceAt: null, lastRecurrenceAt: null },
        ],
      },
    }),
  ])

  const results = []
  for (const campaign of scheduledCampaigns) {
    results.push(await processScheduledCampaign(campaign))
  }
  for (const campaign of recurringCampaigns) {
    results.push(await processRecurringCampaign(campaign))
  }

  const totalProcessed = scheduledCampaigns.length + recurringCampaigns.length
  const successCount = results.filter((r) => r.success).length

  return {
    totalProcessed,
    successCount,
    results,
    message: `Processed ${totalProcessed} campaigns (${successCount} successful)`,
  }
}
