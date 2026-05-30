import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { addBulkEmailJobs } from '@/lib/email-queue'
import { applyEmailVariables, buildContactVariables } from '@/lib/email-variables'
import { getAvailableAccount } from '@/lib/select-email-account'
import { verifyCronSecret } from '@/lib/cron-auth'

/**
 * GET/POST /api/cron/launch-scheduled
 *
 * 定时任务：
 * 1. 启动所有到期的 SCHEDULED Campaign
 * 2. 执行到期的 RECURRING Campaign
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

/**
 * 计算下次重复执行时间
 */
function calculateNextRecurrence(recurrenceRule: string, lastRun: Date): Date | null {
  const now = new Date()

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
    default: {
      // 尝试解析为简单的 cron 表达式（格式：分 时 日 月 周）
      // 简化实现：只支持基本格式
      return null
    }
  }
}

/**
 * 检查是否应该在当前时间窗口执行
 */
function shouldExecuteNow(sendingWindows: any, timezone: string): boolean {
  if (!sendingWindows) return true

  try {
    const now = new Date()
    // 简化实现：使用 UTC 时间
    const currentHour = now.getUTCHours()
    const currentMinute = now.getUTCMinutes()
    const currentTime = currentHour * 60 + currentMinute

    const { start, end } = sendingWindows
    if (!start || !end) return true

    const [startHour, startMinute] = start.split(':').map(Number)
    const [endHour, endMinute] = end.split(':').map(Number)
    const startTime = startHour * 60 + startMinute
    const endTime = endHour * 60 + endMinute

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime
    } else {
      // 跨午夜的情况
      return currentTime >= startTime || currentTime <= endTime
    }
  } catch {
    return true
  }
}

async function handleCronRequest(req: NextRequest) {
  try {
    const unauthorized = verifyCronSecret(req)
    if (unauthorized) return unauthorized

    console.log('[Cron] Starting launch-scheduled job...')

    // 查找所有到期的 SCHEDULED Campaign
    const now = new Date()
    const scheduledCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
    })

    // 查找所有需要执行的 RECURRING Campaign
    const recurringCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'RUNNING',
        scheduleType: 'RECURRING',
        recurrenceRule: { not: null },
        OR: [
          { nextRecurrenceAt: { lte: now } },
          { nextRecurrenceAt: null, lastRecurrenceAt: null },
        ],
      },
    })

    console.log(`[Cron] Found ${scheduledCampaigns.length} scheduled campaigns to launch`)
    console.log(`[Cron] Found ${recurringCampaigns.length} recurring campaigns to check`)

    const results = []

    // 处理 SCHEDULED Campaign
    for (const campaign of scheduledCampaigns) {
      const result = await processScheduledCampaign(campaign)
      results.push(result)
    }

    // 处理 RECURRING Campaign
    for (const campaign of recurringCampaigns) {
      const result = await processRecurringCampaign(campaign)
      results.push(result)
    }

    const totalProcessed = scheduledCampaigns.length + recurringCampaigns.length
    const successCount = results.filter((r) => r.success).length

    return NextResponse.json({
      success: true,
      message: `Processed ${totalProcessed} campaigns (${successCount} successful)`,
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

async function processScheduledCampaign(campaign: any) {
  try {
    // 获取 Campaign 关联的用户
    const tenant = await prisma.tenant.findUnique({
      where: { id: campaign.tenantId! },
      include: { users: { take: 1 } },
    })

    const userId = tenant?.users[0]?.id
    if (!userId) {
      console.error(`[Cron] Campaign ${campaign.id}: no user found`)
      return {
        campaignId: campaign.id,
        success: false,
        error: 'No user found',
      }
    }

    // 获取可用的发件账户
    const availableAccountId = await getAvailableAccount(userId, campaign.emailAccountId)
    if (!availableAccountId) {
      console.error(`[Cron] Campaign ${campaign.id}: no available email account`)
      return {
        campaignId: campaign.id,
        success: false,
        error: 'No available email account',
      }
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
      return {
        campaignId: campaign.id,
        success: false,
        error: 'No valid contacts',
      }
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
      return {
        campaignId: campaign.id,
        success: false,
        error: 'No emails to send',
      }
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
    return {
      campaignId: campaign.id,
      success: true,
      enqueued: emailJobs.length,
      jobIds,
    }
  } catch (error: any) {
    console.error(`[Cron] Campaign ${campaign.id} failed:`, error)
    return {
      campaignId: campaign.id,
      success: false,
      error: error.message,
    }
  }
}

async function processRecurringCampaign(campaign: any) {
  try {
    const now = new Date()

    // 检查是否在发送时间窗口内
    if (!shouldExecuteNow(campaign.sendingWindows, campaign.timezone)) {
      console.log(`[Cron] Campaign ${campaign.id}: outside sending window, skipping`)
      return {
        campaignId: campaign.id,
        success: true,
        skipped: true,
        reason: 'Outside sending window',
      }
    }

    // 获取 Campaign 关联的用户
    const tenant = await prisma.tenant.findUnique({
      where: { id: campaign.tenantId! },
      include: { users: { take: 1 } },
    })

    const userId = tenant?.users[0]?.id
    if (!userId) {
      console.error(`[Cron] Campaign ${campaign.id}: no user found`)
      return {
        campaignId: campaign.id,
        success: false,
        error: 'No user found',
      }
    }

    // 获取可用的发件账户
    const availableAccountId = await getAvailableAccount(userId, campaign.emailAccountId)
    if (!availableAccountId) {
      console.error(`[Cron] Campaign ${campaign.id}: no available email account`)
      return {
        campaignId: campaign.id,
        success: false,
        error: 'No available email account',
      }
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
      return {
        campaignId: campaign.id,
        success: false,
        error: 'No valid contacts',
      }
    }

    // 对于 RECURRING，检查最近一次发送时间，避免重复发送
    const recentLogs = await prisma.emailLog.findMany({
      where: {
        campaignId: campaign.id,
        createdAt: {
          gte: campaign.lastRecurrenceAt || new Date(0),
        },
      },
      select: { contactId: true },
    })
    const recentlySentIds = new Set(recentLogs.map((log) => log.contactId))

    // 只发送在上次执行后未发送的联系人
    const pendingContacts = contacts.filter((c) => !recentlySentIds.has(c.id))
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
      console.warn(`[Cron] Campaign ${campaign.id}: no new emails to send`)
      // 更新下次执行时间
      const nextRecurrence = calculateNextRecurrence(campaign.recurrenceRule, now)
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          lastRecurrenceAt: now,
          nextRecurrenceAt: nextRecurrence,
        },
      })
      return {
        campaignId: campaign.id,
        success: true,
        enqueued: 0,
        reason: 'No new emails to send',
      }
    }

    // 添加邮件任务到队列
    const jobIds = await addBulkEmailJobs(emailJobs as any[])

    // 更新执行时间
    const nextRecurrence = calculateNextRecurrence(campaign.recurrenceRule, now)
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        lastRecurrenceAt: now,
        nextRecurrenceAt: nextRecurrence,
      },
    })

    console.log(`[Cron] Campaign ${campaign.id}: executed recurring with ${emailJobs.length} emails`)
    return {
      campaignId: campaign.id,
      success: true,
      enqueued: emailJobs.length,
      jobIds,
      nextRecurrence: nextRecurrence?.toISOString(),
    }
  } catch (error: any) {
    console.error(`[Cron] Campaign ${campaign.id} failed:`, error)
    return {
      campaignId: campaign.id,
      success: false,
      error: error.message,
    }
  }
}
