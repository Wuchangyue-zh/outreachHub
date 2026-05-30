import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addBulkEmailJobs } from '@/lib/email-queue'
import { applyEmailVariables, buildContactVariables } from '@/lib/email-variables'
import { getAvailableAccount } from '@/lib/select-email-account'

/**
 * GET/POST /api/cron/launch-scheduled
 *
 * 定时任务：启动所有到期的 SCHEDULED Campaign
 *
 * 触发方式：
 * 1. Vercel Cron: 在 vercel.json 中配置
 * 2. 外部 Cron 服务：如 cron-job.org、EasyCron 等
 * 3. 手动调用：curl -X POST http://localhost:3030/api/cron/launch-scheduled
 *
 * 环境变量：
 * - CRON_SECRET: 可选，用于验证请求来源的密钥
 */
export async function GET(req: NextRequest) {
  return handleCronRequest(req)
}

export async function POST(req: NextRequest) {
  return handleCronRequest(req)
}

async function handleCronRequest(req: NextRequest) {
  try {
    // 可选：验证 Cron 密钥
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = req.headers.get('authorization')
      const urlSecret = req.nextUrl.searchParams.get('secret')

      if (authHeader !== `Bearer ${cronSecret}` && urlSecret !== cronSecret) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    console.log('[Cron] Starting launch-scheduled job...')

    // 查找所有到期的 SCHEDULED Campaign
    const now = new Date()
    const scheduledCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
    })

    console.log(`[Cron] Found ${scheduledCampaigns.length} scheduled campaigns to launch`)

    const results = []

    for (const campaign of scheduledCampaigns) {
      try {
        // 获取 Campaign 关联的用户
        const tenant = await prisma.tenant.findUnique({
          where: { id: campaign.tenantId! },
          include: { users: { take: 1 } },
        })

        const userId = tenant?.users[0]?.id
        if (!userId) {
          console.error(`[Cron] Campaign ${campaign.id}: no user found`)
          results.push({
            campaignId: campaign.id,
            success: false,
            error: 'No user found',
          })
          continue
        }

        // 获取可用的发件账户
        const availableAccountId = await getAvailableAccount(userId, campaign.emailAccountId)
        if (!availableAccountId) {
          console.error(`[Cron] Campaign ${campaign.id}: no available email account`)
          results.push({
            campaignId: campaign.id,
            success: false,
            error: 'No available email account',
          })
          continue
        }

        // 获取联系人
        const contacts = await prisma.contact.findMany({
          where: {
            id: { in: campaign.contactIds || [] },
            tenantId: campaign.tenantId!,
          },
          include: {
            company: true,
            emails: {
              where: { isPrimary: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        })

        if (contacts.length === 0) {
          console.error(`[Cron] Campaign ${campaign.id}: no valid contacts`)
          results.push({
            campaignId: campaign.id,
            success: false,
            error: 'No valid contacts',
          })
          continue
        }

        // 跳过已发送的联系人
        const alreadySent = await prisma.emailLog.findMany({
          where: {
            campaignId: campaign.id,
            status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'] },
          },
          select: { contactId: true },
        })
        const sentContactIds = new Set(alreadySent.map((log) => log.contactId))

        const pendingContacts = contacts.filter((c) => !sentContactIds.has(c.id))
        const maxQueue = campaign.throttlePerDay || 200
        const contactSlice = pendingContacts.slice(0, maxQueue)

        // 构建邮件任务
        const emailJobs = contactSlice
          .map((contact) => {
            const primaryEmail = contact.emails[0]
            if (!primaryEmail) return null

            const vars = buildContactVariables(contact, primaryEmail.address)
            const rawHtml = campaign.htmlContent || campaign.content || ''
            const subject = applyEmailVariables(campaign.subject, vars)
            const html = applyEmailVariables(rawHtml, vars)
            const text = applyEmailVariables(campaign.content || '', vars)

            return {
              to: primaryEmail.address,
              subject,
              html,
              text,
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
          console.warn(`[Cron] Campaign ${campaign.id}: no emails to send`)
          results.push({
            campaignId: campaign.id,
            success: false,
            error: 'No emails to send',
          })
          continue
        }

        // 更新状态为 RUNNING
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: 'RUNNING',
            sentAt: new Date(),
          },
        })

        // 添加邮件任务到队列
        const jobIds = await addBulkEmailJobs(emailJobs as any[])

        console.log(`[Cron] Campaign ${campaign.id}: launched with ${emailJobs.length} emails`)
        results.push({
          campaignId: campaign.id,
          success: true,
          enqueued: emailJobs.length,
          jobIds,
        })
      } catch (error: any) {
        console.error(`[Cron] Campaign ${campaign.id} failed:`, error)
        results.push({
          campaignId: campaign.id,
          success: false,
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${scheduledCampaigns.length} scheduled campaigns`,
      data: results,
    })
  } catch (error: any) {
    console.error('[Cron] launch-scheduled failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}
