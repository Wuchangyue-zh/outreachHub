import { Worker, Job } from 'bullmq'
import { getRedisConnection } from './redis'
import { sendPlatformMail } from './email'
import { sendAccountMail, checkDailyLimit } from './email-account-mail'
import { prisma } from './prisma'
import { addEmailTracking } from './email-tracking'
import { applyEmailVariables, buildContactVariables } from './email-variables'
import type { EmailJobData } from './email-queue'
import { maybeMarkCampaignCompleted } from './campaign-completion'
import { isPermanentBounce, markAsBounced } from './bounce-handler'
import { getWorkerConcurrency, getWorkerRateLimit } from './env'
import { fetchFileBuffer } from './storage'
import { resolvePublicUrls } from './email-html'
import { incrementTenantStat } from './stats-aggregate'
import { updateCampaignContactStatus } from './campaign-contacts'
import { resolvePersonalizedContent } from './email-personalize'

/** AI personalization + SMTP can exceed default 30s BullMQ lock */
const WORKER_LOCK_DURATION_MS = 5 * 60 * 1000

async function processEmailJob(job: Job<EmailJobData>) {
  const {
    to,
    subject,
    html,
    text,
    contactId,
    campaignId,
    emailAccountId,
    fromEmail,
    fromName,
    trackingPixel,
    trackingLinks,
    attachmentIds,
    personalizePerContact,
    baseSubject,
    baseHtml,
    baseText,
    productDescription,
    tone,
    language,
  } = job.data

  console.log(`[Email Worker] Processing job ${job.id}: Sending to ${to}`)

  await job.updateProgress(5)

  // 确定发件人 + 日限额（必须在 AI 之前，避免白烧 Token）
  let senderEmail = fromEmail || process.env.SMTP_USER || ''
  if (emailAccountId) {
    const canSend = await checkDailyLimit(emailAccountId)
    if (!canSend) {
      console.warn(`[Email Worker] EmailAccount ${emailAccountId} reached daily limit, skipping job ${job.id}`)
      throw new Error(`EmailAccount ${emailAccountId} reached daily limit`)
    }
    const account = await prisma.emailAccount.findUnique({
      where: { id: emailAccountId },
      select: { email: true },
    })
    if (account) {
      senderEmail = account.email
    }
  }

  await job.updateProgress(10)

  // 千邮千面 / 变量替换
  const resolved = await resolvePersonalizedContent({
    to,
    subject,
    html,
    text,
    contactId,
    personalizePerContact,
    baseSubject,
    baseHtml,
    baseText,
    productDescription,
    tone,
    language,
  })

  if (resolved.fallbackReason) {
    console.warn(
      `[Email Worker] Personalize fallback for ${to}: ${resolved.fallbackReason}`
    )
  }

  let finalSubject = resolved.subject
  let finalHtml = resolved.html || ''
  let finalText = resolved.text || ''

  // 非个性化路径仍可能需要变量替换（兼容旧 job 只传未替换模板）
  if (!personalizePerContact && contactId && (subject.includes('{{') || (html || '').includes('{{') || (text || '').includes('{{'))) {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        company: true,
        emails: { where: { isPrimary: true }, take: 1 },
      },
    })
    if (contact) {
      const primaryEmail = contact.emails[0]?.address || to
      const variables = buildContactVariables(contact, primaryEmail)
      finalSubject = applyEmailVariables(subject, variables)
      finalHtml = applyEmailVariables(html || '', variables)
      finalText = applyEmailVariables(text || '', variables)
    }
  }

  await job.updateProgress(25)

  // H1: 加载附件 Buffer
  let emailAttachments: Array<{ filename: string; content: Buffer }> | undefined
  if (attachmentIds && attachmentIds.length > 0) {
    try {
      const attachments = await prisma.attachment.findMany({
        where: { id: { in: attachmentIds } },
      })
      const loaded: Array<{ filename: string; content: Buffer }> = []
      for (const att of attachments) {
        try {
          const { buffer, filename } = await fetchFileBuffer(att.url)
          loaded.push({ filename: att.originalName || filename, content: buffer })
        } catch (err) {
          console.warn(`[Email Worker] Failed to load attachment ${att.id}:`, err)
        }
      }
      if (loaded.length > 0) emailAttachments = loaded
    } catch (err) {
      console.warn(`[Email Worker] Failed to fetch attachments:`, err)
    }
  }

  // Create email log entry（不把 personalize_fallback 写入 error 字段）
  const emailLogData: any = {
    contactId: contactId || '',
    messageId: '',
    toEmail: to,
    fromEmail: senderEmail,
    subject: finalSubject,
    status: 'PENDING',
    sentAt: new Date(),
    content: finalText || finalHtml || '',
    htmlContent: finalHtml,
  }

  if (campaignId) {
    emailLogData.campaignId = campaignId
  }

  const emailLog = await prisma.emailLog.create({
    data: emailLogData,
  })

  await job.updateProgress(30)

  // Prepare email content with tracking using the centralized addEmailTracking function
  let emailHtml = finalHtml
  if (emailLog.id && contactId) {
    emailHtml = addEmailTracking(emailHtml, emailLog.id, contactId, campaignId)
  } else if (trackingPixel && emailLog.id) {
    const pixelUrl = `${process.env.APP_URL}/api/email/track/open?e=${emailLog.id}&c=${contactId || ''}&t=${Date.now()}`
    emailHtml += `<img src="${pixelUrl}" width="1" height="1" style="display:none" />`
  }

  emailHtml = resolvePublicUrls(emailHtml)

  await job.updateProgress(50)

  try {
    let result: { success: boolean; messageId?: string }

    if (emailAccountId) {
      result = await sendAccountMail({
        emailAccountId,
        to,
        subject: finalSubject,
        html: emailHtml,
        text: finalText,
        from: fromName ? `${fromName} <${senderEmail}>` : senderEmail,
        attachments: emailAttachments,
      })
    } else {
      result = await sendPlatformMail({
        to,
        subject: finalSubject,
        html: emailHtml,
        text: finalText,
        from: fromName ? `${fromName} <${senderEmail}>` : senderEmail,
        attachments: emailAttachments,
      })
    }

    await job.updateProgress(90)

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'SENT',
        messageId: result.messageId,
      },
    })

    if (contactId) {
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          emailsSent: { increment: 1 },
          lastContactedAt: new Date(),
        },
      })
    }

    if (campaignId) {
      await maybeMarkCampaignCompleted(campaignId)
      if (contactId) {
        await updateCampaignContactStatus(campaignId, contactId, 'SENT').catch(() => {})
      }
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { tenantId: true },
      })
      if (campaign?.tenantId) {
        await incrementTenantStat(campaign.tenantId, 'emailsSent')
      }
    }

    if (emailAccountId) {
      await prisma.emailAccount.update({
        where: { id: emailAccountId },
        data: { healthScore: { increment: 0.5 } },
      }).catch((err) => console.error(`[Worker] Failed to recover healthScore for ${emailAccountId}:`, err))
    }

    await job.updateProgress(100)
    return { success: true, emailLogId: emailLog.id, messageId: result.messageId }
  } catch (error: any) {
    console.error(`[Email Worker] Job ${job.id} failed:`, error)

    const isBounce = isPermanentBounce(error.message || '')

    if (isBounce) {
      await markAsBounced(emailLog.id, error.message, emailAccountId)
    } else {
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      })

      if (emailAccountId) {
        await prisma.emailAccount.update({
          where: { id: emailAccountId },
          data: { healthScore: { decrement: 2 } },
        }).catch((err) => console.error(`[Worker] Failed to degrade healthScore for ${emailAccountId}:`, err))
      }
    }

    if (campaignId) {
      await maybeMarkCampaignCompleted(campaignId)
    }

    throw error
  }
}


export function createEmailWorker() {
  const connection = getRedisConnection()
  if (!connection) {
    throw new Error('Redis is not configured. Set REDIS_URL or REDIS_HOST in .env to run the email worker.')
  }

  const rateLimit = getWorkerRateLimit()
  const worker = new Worker<EmailJobData>('email-queue', processEmailJob, {
    connection,
    concurrency: getWorkerConcurrency(5),
    lockDuration: WORKER_LOCK_DURATION_MS,
    limiter: {
      max: rateLimit.max,
      duration: rateLimit.duration,
    },
  })

  worker.on('completed', (job) => {
    console.log(`[Email Worker] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[Email Worker] Job ${job?.id} failed:`, err.message)
  })

  worker.on('error', (err) => {
    console.error('[Email Worker] Worker error:', err)
  })

  return worker
}

// Start worker if this file is run directly
if (require.main === module) {
  console.log('[Email Worker] Starting email worker...')
  let worker
  try {
    worker = createEmailWorker()
  } catch (error) {
    console.error('[Email Worker]', (error as Error).message)
    process.exit(1)
  }

  process.on('SIGTERM', async () => {
    console.log('[Email Worker] Shutting down...')
    await worker.close()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    console.log('[Email Worker] Shutting down...')
    await worker.close()
    process.exit(0)
  })
}
