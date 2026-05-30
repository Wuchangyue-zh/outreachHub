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
import { incrementTenantStat } from './stats-aggregate'
import { updateCampaignContactStatus } from './campaign-contacts'

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
  } = job.data

  console.log(`[Email Worker] Processing job ${job.id}: Sending to ${to}`)

  // Update job progress
  await job.updateProgress(10)

  // P1-10: 模板变量替换
  let finalSubject = subject
  let finalHtml = html || ''
  let finalText = text || ''

  if (contactId) {
    // 获取联系人信息用于变量替换
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        company: true,
        emails: {
          where: { isPrimary: true },
          take: 1,
        },
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

  // 确定发件人邮箱
  let senderEmail = fromEmail || process.env.SMTP_USER || ''

  // 如果指定了 EmailAccount，检查发送限额并获取发件人邮箱
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

  // Create email log entry
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
    // Fallback: just add tracking pixel if no contactId
    const pixelUrl = `${process.env.APP_URL}/api/email/track/open?e=${emailLog.id}&c=${contactId || ''}&t=${Date.now()}`
    emailHtml += `<img src="${pixelUrl}" width="1" height="1" style="display:none" />`
  }

  await job.updateProgress(50)

  try {
    // Send email - 根据是否有 EmailAccount 选择发送方式
    let result: { success: boolean; messageId?: string }

    if (emailAccountId) {
      // 使用用户 EmailAccount 发送
      result = await sendAccountMail({
        emailAccountId,
        to,
        subject: finalSubject,
        html: emailHtml,
        text: finalText,
        from: fromName ? `${fromName} <${senderEmail}>` : senderEmail,
      })
    } else {
      // 使用平台 SMTP 发送（降级）
      result = await sendPlatformMail({
        to,
        subject: finalSubject,
        html: emailHtml,
        text: finalText,
        from: fromName ? `${fromName} <${senderEmail}>` : senderEmail,
      })
    }

    await job.updateProgress(90)

    // Update email log with success
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'SENT',
        messageId: result.messageId,
      },
    })

    // Update contact email statistics if contactId exists
    if (contactId) {
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          emailsSent: { increment: 1 },
          lastContactedAt: new Date(),
        },
      })
    }

    // #9: 不再直接 totalSent++，由 stats API 从 EmailLog 聚合后同步
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

    // #14: 发送成功时小幅恢复账户健康度（上限由 select-email-account 控制）
    if (emailAccountId) {
      await prisma.emailAccount.update({
        where: { id: emailAccountId },
        data: { healthScore: { increment: 0.5 } },
      }).catch((err) => console.error(`[Worker] Failed to recover healthScore for ${emailAccountId}:`, err))
    }

    await job.updateProgress(100)

    console.log(`[Email Worker] Job ${job.id} completed: ${result.messageId}`)

    return {
      success: true,
      messageId: result.messageId,
      emailLogId: emailLog.id,
    }
  } catch (error: any) {
    console.error(`[Email Worker] Job ${job.id} failed:`, error)

    // #14: 检测是否为永久性退信（5xx SMTP 错误）
    const isBounce = isPermanentBounce(error.message || '')

    if (isBounce) {
      // 退信：标记 BOUNCED + 降级健康度 + 更新统计
      await markAsBounced(emailLog.id, error.message, emailAccountId)
    } else {
      // 普通发送失败
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      })

      // #14: 发送失败时降低账户健康度
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
