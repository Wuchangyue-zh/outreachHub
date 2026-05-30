import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const { id } = await ctx.params
    const campaign = await prisma.campaign.findUnique({
      where: { id, tenantId: auth.tenantId },
    })

    if (!campaign) {
      return errorResponse(ErrorCodes.NOT_FOUND, '活动不存在', 404)
    }

    return NextResponse.json({ success: true, data: campaign })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)
    // #48: 编辑活动需要 campaigns:manage 权限
    if (!hasPermission(auth.role, 'campaigns:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要营销管理权限', 403)
    }

    const { id } = await ctx.params

    // 验证记录归属
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
    // #48: 更新活动需要 campaigns:manage 权限
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
    const updateData: Record<string, any> = {}

    if (body.status !== undefined) updateData.status = body.status
    if (body.name !== undefined) updateData.name = body.name
    if (body.subject !== undefined) updateData.subject = body.subject
    if (body.content !== undefined) updateData.content = body.content
    if (body.htmlContent !== undefined) updateData.htmlContent = body.htmlContent
    if (body.fromName !== undefined) updateData.fromName = body.fromName
    if (body.fromEmail !== undefined) updateData.fromEmail = body.fromEmail
    if (body.replyTo !== undefined) updateData.replyTo = body.replyTo
    if (body.contactIds !== undefined) updateData.contactIds = body.contactIds
    if (body.scheduleType !== undefined) updateData.scheduleType = body.scheduleType
    if (body.scheduledAt !== undefined) updateData.scheduledAt = new Date(body.scheduledAt)
    if (body.timezone !== undefined) updateData.timezone = body.timezone
    if (body.sendingWindows !== undefined) updateData.sendingWindows = body.sendingWindows
    if (body.throttlePerHour !== undefined) updateData.throttlePerHour = body.throttlePerHour
    if (body.throttlePerDay !== undefined) updateData.throttlePerDay = body.throttlePerDay
    if (body.abTestEnabled !== undefined) updateData.abTestEnabled = body.abTestEnabled
    if (body.type !== undefined) updateData.type = body.type
    // #52: 产品关联
    if (body.productId !== undefined) updateData.productId = body.productId || null

    const campaign = await prisma.campaign.update({
      where: { id, tenantId: auth.tenantId },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: campaign })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)
    // #48: 删除活动需要 campaigns:manage 权限
    if (!hasPermission(auth.role, 'campaigns:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要营销管理权限', 403)
    }

    const { id } = await ctx.params

    // 验证记录归属
    const existing = await prisma.campaign.findUnique({
      where: { id, tenantId: auth.tenantId },
      select: { id: true },
    })
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '活动不存在或无权操作', 404)
    }

    await prisma.emailLog.deleteMany({ where: { campaignId: id } })
    await prisma.campaign.delete({ where: { id, tenantId: auth.tenantId } })
    return NextResponse.json({ success: true, message: '活动已删除' })
  } catch (error) {
    return handleApiError(error)
  }
}
