import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCronSecret } from '@/lib/cron-auth'
import { addEmailJob } from '@/lib/email-queue'
import { getAvailableAccount } from '@/lib/select-email-account'

type FollowUpStep = {
  type: string
  scheduledAt: string
  reason?: string
  originalCampaignId?: string
  originalLogId?: string
  replyBody?: string
}

/**
 * GET/POST /api/cron/process-follow-ups
 *
 * #24: 执行到期的 OOO 跟进 Task，发送提醒邮件
 */
export async function GET(req: NextRequest) {
  return handleProcessFollowUps(req)
}

export async function POST(req: NextRequest) {
  return handleProcessFollowUps(req)
}

async function handleProcessFollowUps(_req: NextRequest) {
  try {
    const unauthorized = verifyCronSecret(_req)
    if (unauthorized) return unauthorized

    const now = new Date()
    const tasks = await prisma.task.findMany({
      where: {
        type: 'FOLLOW_UP',
        status: 'PENDING',
      },
      take: 50,
    })

    let processed = 0

    for (const task of tasks) {
      const steps = (Array.isArray(task.steps) ? task.steps : []) as FollowUpStep[]
      const step = steps[0]
      if (!step?.scheduledAt) continue

      const scheduledAt = new Date(step.scheduledAt)
      if (scheduledAt > now) continue

      const contactId = task.contactIds[0]
      if (!contactId) continue

      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: {
          emails: { where: { isPrimary: true }, take: 1 },
        },
      })
      const toEmail = contact?.emails[0]?.address
      if (!toEmail) {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: 'FAILED', completedAt: new Date() },
        })
        continue
      }

      let emailAccountId: string | undefined
      let fromName: string | undefined
      let fromEmail: string | undefined
      let campaignId: string | undefined

      if (step.originalCampaignId) {
        const campaign = await prisma.campaign.findUnique({
          where: { id: step.originalCampaignId },
          select: {
            id: true,
            emailAccountId: true,
            fromName: true,
            fromEmail: true,
            tenantId: true,
          },
        })
        if (campaign) {
          campaignId = campaign.id
          fromName = campaign.fromName || undefined
          fromEmail = campaign.fromEmail || undefined
          const owner = await prisma.user.findFirst({
            where: { tenantId: campaign.tenantId || task.tenantId || undefined },
            select: { id: true },
          })
          if (owner) {
            emailAccountId = (await getAvailableAccount(owner.id, campaign.emailAccountId)) || undefined
          }
        }
      }

      const firstName = contact?.firstName || toEmail.split('@')[0]
      const subject = `Following up — ${firstName}`
      const text =
        `Hi ${firstName},\n\n` +
        `I wanted to follow up on my previous email in case it reached you while you were out of the office.\n\n` +
        `Would you have a few minutes to connect this week?\n\n` +
        `Best regards`

      await addEmailJob({
        to: toEmail,
        subject,
        text,
        html: text.replace(/\n/g, '<br/>'),
        contactId,
        campaignId,
        emailAccountId,
        fromEmail,
        fromName,
      })

      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedContacts: 1,
        },
      })
      processed++
    }

    return NextResponse.json({ success: true, data: { processed, checked: tasks.length } })
  } catch (error) {
    console.error('[process-follow-ups] Error:', error)
    return NextResponse.json({ success: false, error: '跟进任务处理失败' }, { status: 500 })
  }
}
