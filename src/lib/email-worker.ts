import { Worker, Job } from 'bullmq'
import { redisConnection } from './redis'
import { sendMail } from './email'
import { prisma } from './prisma'
import type { EmailJobData } from './email-queue'

async function processEmailJob(job: Job<EmailJobData>) {
  const {
    to,
    subject,
    html,
    text,
    contactId,
    campaignId,
    fromEmail,
    fromName,
    replyTo,
    trackingPixel,
    trackingLinks,
  } = job.data

  console.log(`[Email Worker] Processing job ${job.id}: Sending to ${to}`)

  // Update job progress
  await job.updateProgress(10)

  // Create email log entry
  const emailLogData: any = {
    contactId: contactId || '',
    messageId: '',
    toEmail: to,
    fromEmail: fromEmail || process.env.SMTP_USER || '',
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

  // Prepare email content with tracking
  let emailHtml = html || ''
  if (trackingPixel && emailLog.id) {
    const pixelUrl = `${process.env.APP_URL}/api/email/track/open?id=${emailLog.id}`
    emailHtml += `<img src="${pixelUrl}" width="1" height="1" style="display:none" />`
  }

  if (trackingLinks && emailHtml) {
    // Replace links with tracking links
    emailHtml = emailHtml.replace(
      /href="(https?:\/\/[^"]+)"/g,
      (match, url) => {
        const trackingUrl = `${process.env.APP_URL}/api/email/track/click?id=${emailLog.id}&url=${encodeURIComponent(url)}`
        return `href="${trackingUrl}"`
      }
    )
  }

  await job.updateProgress(50)

  try {
    // Send email
    const result = await sendMail({
      to,
      subject,
      html: emailHtml,
      text,
      from: fromName ? `${fromName} <${fromEmail || process.env.SMTP_USER}>` : fromEmail,
    })

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

    // Update campaign failed count if campaignId exists
    if (campaignId) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalBounced: { increment: 1 },
        },
      })
    }

    throw error
  }
}

export function createEmailWorker() {
  const worker = new Worker<EmailJobData>('email-queue', processEmailJob, {
    connection: redisConnection,
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
  const worker = createEmailWorker()

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
