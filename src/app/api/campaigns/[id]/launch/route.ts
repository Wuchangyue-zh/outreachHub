import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { addBulkEmailJobs } from '@/lib/email-queue'
import { addEmailTracking } from '@/lib/email-tracking'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * POST /api/campaigns/[id]/launch
 *
 * Transitions campaign status to RUNNING and enqueues emails for all contacts.
 * Uses the campaign's subject/content/fromEmail settings.
 * Respects throttlePerDay limit.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)

    const { id } = await ctx.params

    const campaign = await prisma.campaign.findUnique({
      where: { id, tenantId: auth.tenantId },
    })
    if (!campaign) return errorResponse(ErrorCodes.NOT_FOUND, '活动不存在或无权操作', 404)

    // Can only launch from DRAFT or PAUSED
    if (!['DRAFT', 'PAUSED'].includes(campaign.status)) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, `无法从 ${campaign.status} 状态启动`, 400)
    }

    // Check if there are contacts
    if (!campaign.contactIds || campaign.contactIds.length === 0) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '请先为该活动添加目标联系人', 400)
    }

    // Fetch contacts to get their email addresses
    const contacts = await prisma.contact.findMany({
      where: {
        id: { in: campaign.contactIds },
        tenantId: auth.tenantId,
      },
      include: {
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

    // Apply throttle: only enqueue up to throttlePerDay
    const maxQueue = campaign.throttlePerDay || 200
    const contactSlice = contacts.slice(0, maxQueue)

    // Build email job data array
    const emailJobs = contactSlice
      .map((contact) => {
        const primaryEmail = contact.emails[0]
        if (!primaryEmail) return null

        let htmlContent = campaign.htmlContent || campaign.content
        // Apply tracking
        htmlContent = addEmailTracking(htmlContent, 'pending', contact.id)

        // Simple variable substitution
        let subject = campaign.subject
        let bodyText = campaign.content
        subject = subject
          .replace(/\{\{firstName\}\}/g, contact.firstName || '')
          .replace(/\{\{lastName\}\}/g, contact.lastName || '')
          .replace(/\{\{fullName\}\}/g, contact.fullName || '')
          .replace(/\{\{companyName\}\}/g, '',
          )
        bodyText = bodyText
          .replace(/\{\{firstName\}\}/g, contact.firstName || '')
          .replace(/\{\{lastName\}\}/g, contact.lastName || '')
          .replace(/\{\{fullName\}\}/g, contact.fullName || '')
          .replace(/\{\{companyName\}\}/g, '')

        return {
          to: primaryEmail.address,
          subject,
          html: htmlContent,
          text: bodyText,
          contactId: contact.id,
          campaignId: campaign.id,
          fromEmail: campaign.fromEmail || process.env.SMTP_USER || '',
          fromName: campaign.fromName || '',
          trackingPixel: 'true',
          trackingLinks: true,
        }
      })
      .filter(Boolean)

    if (emailJobs.length === 0) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '没有具有有效邮箱地址的联系人', 400)
    }

    // Update campaign status to RUNNING
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'RUNNING',
        sentAt: new Date(),
      },
    })

    // Enqueue all jobs
    const jobIds = await addBulkEmailJobs(emailJobs as any[])

    return NextResponse.json({
      success: true,
      data: {
        campaignId: campaign.id,
        status: 'RUNNING',
        enqueued: emailJobs.length,
        jobIds,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
