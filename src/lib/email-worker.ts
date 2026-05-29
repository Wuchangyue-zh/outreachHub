import { Worker, Job } from 'bullmq'
import { getRedisConnection } from './redis'
import { sendPlatformMail } from './email'
import { sendAccountMail, checkDailyLimit } from './email-account-mail'
import { prisma } from './prisma'
import { addEmailTracking } from './email-tracking'
import type { EmailJobData } from './email-queue'

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
    subject,
    status: 'PENDING',
    sentAt: new Date(),
    htmlContent: html,
  }

  if (campaignId) {
    emailLogData.campaignId = campaignId
  }

  const emailLog = await prisma.emailLog.create({
    data: emailLogData,
  })

  await job.updateProgress(30)

  // Prepare email content with tracking using the centralized addEmailTracking function
  let emailHtml = html || ''
  if (emailLog.id && contactId) {
    emailHtml = addEmailTracking(emailHtml, emailLog.id, contactId)
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
        subject,
        html: emailHtml,
        text,
        from: fromName ? `${fromName} <${senderEmail}>` : senderEmail,
      })
    } else {
      // 使用平台 SMTP 发送（降级）
      result = await sendPlatformMail({
        to,
        subject,
        html: emailHtml,
        text,
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

    // Update campaign statistics if campaignId exists
    if (campaignId) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalSent: { increment: 1 },
        },
      })
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

    // Update email log with failure
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'FAILED',
        error: error.message,
      },
    })

    // P1-6 修复：SMTP 发送失败不计入 totalBounced（那是真实退信统计）
    // 失败记录已保存在 EmailLog 中，可通过查询 EmailLog 统计失败数

    throw error
  }
}

export function createEmailWorker() {
  const connection = getRedisConnection()
  if (!connection) {
    throw new Error('Redis is not configured. Set REDIS_URL or REDIS_HOST in .env to run the email worker.')
  }

  const worker = new Worker<EmailJobData>('email-queue', processEmailJob, {
    connection,
    concurrency: 5, // Process 5 emails concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 60000, // Per minute
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
