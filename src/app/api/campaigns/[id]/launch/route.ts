import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { addBulkEmailJobs } from '@/lib/email-queue'
import { applyEmailVariables, buildContactVariables } from '@/lib/email-variables'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * POST /api/campaigns/[id]/launch
 *
 * Transitions campaign to RUNNING and enqueues emails for contacts.
 * Skips contacts already sent for this campaign (safe resume from PAUSED).
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const { id } = await ctx.params

    const campaign = await prisma.campaign.findUnique({
      where: { id, tenantId: auth.tenantId },
    })
    if (!campaign) return errorResponse(ErrorCodes.NOT_FOUND, '活动不存在或无权操作', 404)

    if (!['DRAFT', 'PAUSED'].includes(campaign.status)) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, `无法从 ${campaign.status} 状态启动`, 400)
    }

    if (!campaign.contactIds?.length) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '请先为该活动添加目标联系人', 400)
    }

    const contacts = await prisma.contact.findMany({
      where: {
        id: { in: campaign.contactIds },
        tenantId: auth.tenantId,
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
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '未找到有效的联系人', 400)
    }

    // Skip contacts already sent for this campaign
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
          emailAccountId: campaign.emailAccountId || undefined,  // 使用 Campaign 绑定的发件账户
          fromEmail: campaign.fromEmail || process.env.SMTP_USER || '',
          fromName: campaign.fromName || '',
          trackingPixel: true,
          trackingLinks: true,
        }
      })
      .filter(Boolean)

    if (emailJobs.length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        campaign.status === 'PAUSED'
          ? '没有待发送的联系人（可能已全部发送）'
          : '没有具有有效邮箱地址的联系人',
        400
      )
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'RUNNING',
        sentAt: campaign.sentAt || new Date(),
      },
    })

    const jobIds = await addBulkEmailJobs(emailJobs as any[])

    return NextResponse.json({
      success: true,
      data: {
        campaignId: campaign.id,
        status: 'RUNNING',
        enqueued: emailJobs.length,
        skipped: contacts.length - pendingContacts.length,
        jobIds,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
