import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { replaceCampaignContacts } from '@/lib/campaign-contacts'
import { writeAuditLog, getAuditRequestMeta } from '@/lib/audit'

type RouteContext = { params: Promise<{ id: string }> }

const EDITABLE_STATUSES = ['DRAFT', 'PAUSED']

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const { id } = await ctx.params
    const campaign = await prisma.campaign.findUnique({
      where: { id, tenantId: auth.tenantId },
      include: {
        emailLogs: {
          orderBy: { createdAt: 'desc' },
          take: 200,
        },
        campaignContacts: {
          take: 500,
          include: {
            contact: {
              select: { id: true, fullName: true, emails: { where: { isPrimary: true }, take: 1 } },
            },
          },
        },

      },
    })

    if (!campaign) {
      return errorResponse(ErrorCodes.NOT_FOUND, '活动不存在', 404)
    }

    // Attachments use polymorphic relations, query separately
    const attachments = await prisma.attachment.findMany({
      where: { relatedType: 'campaign', relatedId: id },
      select: { id: true, filename: true, url: true, size: true, mimeType: true },
    })

    return NextResponse.json({ success: true, data: { ...campaign, attachments } })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)
    if (!hasPermission(auth.role, 'campaigns:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要营销管理权限', 403)
    }

    const { id } = await ctx.params

    const existing = await prisma.campaign.findUnique({
      where: { id, tenantId: auth.tenantId },
      select: { id: true },
    })
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '活动不存在或无权操作', 404)
    }

    const body = await req.json()
    const { name, subject, content, type, scheduleType, scheduledAt } = body

    const campaign = await prisma.campaign.update({
      where: { id, tenantId: auth.tenantId },
      data: {
        name,
        subject,
        content,
        type: type || 'SINGLE',
        scheduleType: scheduleType || 'IMMEDIATE',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    })

    return NextResponse.json({ success: true, data: campaign })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)
    if (!hasPermission(auth.role, 'campaigns:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要营销管理权限', 403)
    }

    const { id } = await ctx.params
    const existing = await prisma.campaign.findUnique({
      where: { id, tenantId: auth.tenantId },
      select: { id: true, status: true },
    })
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '活动不存在或无权操作', 404)
    }

    const body = await req.json()

    // Status guard: editing content fields requires DRAFT or PAUSED
    const isContentEdit = ['name', 'subject', 'content', 'htmlContent', 'type', 'sequence',
      'emailAccountId', 'productId', 'scheduleType', 'scheduledAt', 'timezone',
      'sendingWindows', 'recurrenceRule', 'abTestEnabled', 'contactIds'].some(
      (k) => body[k] !== undefined
    )
    if (isContentEdit && !EDITABLE_STATUSES.includes(existing.status)) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        `活动状态为「${existing.status}」，仅 DRAFT 和 PAUSED 状态允许编辑`,
        403
      )
    }

    const updateData: Record<string, any> = {}

    if (body.status !== undefined) updateData.status = body.status
    if (body.name !== undefined) updateData.name = body.name
    if (body.subject !== undefined) updateData.subject = body.subject
    if (body.content !== undefined) updateData.content = body.content
    if (body.htmlContent !== undefined) updateData.htmlContent = body.htmlContent
    if (body.fromName !== undefined) updateData.fromName = body.fromName
    if (body.fromEmail !== undefined) updateData.fromEmail = body.fromEmail
    if (body.replyTo !== undefined) updateData.replyTo = body.replyTo
    if (body.emailAccountId !== undefined) updateData.emailAccountId = body.emailAccountId || null
    if (body.scheduleType !== undefined) updateData.scheduleType = body.scheduleType
    if (body.scheduledAt !== undefined) updateData.scheduledAt = new Date(body.scheduledAt)
    if (body.timezone !== undefined) updateData.timezone = body.timezone
    if (body.sendingWindows !== undefined) updateData.sendingWindows = body.sendingWindows
    if (body.throttlePerHour !== undefined) updateData.throttlePerHour = body.throttlePerHour
    if (body.throttlePerDay !== undefined) updateData.throttlePerDay = body.throttlePerDay
    if (body.abTestEnabled !== undefined) updateData.abTestEnabled = body.abTestEnabled
    if (body.type !== undefined) updateData.type = body.type
    if (body.productId !== undefined) updateData.productId = body.productId || null
    if (body.recurrenceRule !== undefined) updateData.recurrenceRule = body.recurrenceRule || null
    // Sequence/A-B test config
    if (body.sequence !== undefined) updateData.sequence = body.sequence

    const campaign = await prisma.campaign.update({
      where: { id, tenantId: auth.tenantId },
      data: updateData,
    })

    if (body.contactIds !== undefined && Array.isArray(body.contactIds)) {
      await replaceCampaignContacts(campaign.id, body.contactIds)
    }

    return NextResponse.json({ success: true, data: campaign })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)
    if (!hasPermission(auth.role, 'campaigns:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要营销管理权限', 403)
    }

    const { id } = await ctx.params

    const existing = await prisma.campaign.findUnique({
      where: { id, tenantId: auth.tenantId },
      select: { id: true },
    })
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '活动不存在或无权操作', 404)
    }

    await prisma.emailLog.deleteMany({ where: { campaign: { id, tenantId: auth.tenantId } } })
    await prisma.campaign.delete({ where: { id, tenantId: auth.tenantId } })

    if (auth.userId) {
      await writeAuditLog({
        userId: auth.userId,
        tenantId: auth.tenantId || undefined,
        action: 'delete_campaign',
        resource: 'campaign',
        resourceId: id,
        ...getAuditRequestMeta(req),
      })
    }

    return NextResponse.json({ success: true, message: '活动已删除' })
  } catch (error) {
    return handleApiError(error)
  }
}
