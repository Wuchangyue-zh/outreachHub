import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAuth, hasPermission, tenantWhere } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { isProOrAbove } from '@/lib/plan-limits'

/**
 * PATCH /api/webhooks/[id] — Update a webhook endpoint.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await resolveAuth(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '需要租户关联', 403)
    if (!(await isProOrAbove(auth.tenantId))) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Webhooks 功能需要专业版及以上套餐', 403)
    }
    if (!hasPermission(auth.role, 'settings:manage')) return errorResponse(ErrorCodes.FORBIDDEN, '权限不足', 403)

    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { id, ...tenantWhere(auth.tenantId) },
    })

    if (!endpoint) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Webhook 端点不存在', 404)
    }

    const body = await req.json()
    const { url, events, isActive } = body

    const updateData: Record<string, unknown> = {}
    if (url !== undefined) {
      if (typeof url !== 'string' || !url.trim()) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, 'url 格式无效', 400)
      }
      try {
        new URL(url)
      } catch {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, 'url 格式无效', 400)
      }
      updateData.url = url
    }
    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, 'events 为非空数组', 400)
      }
      updateData.events = events
    }
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }

    const updated = await prisma.webhookEndpoint.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        lastTriggeredAt: true,
        failureCount: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/webhooks/[id] — Delete a webhook endpoint.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = await resolveAuth(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '需要租户关联', 403)
    if (!(await isProOrAbove(auth.tenantId))) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Webhooks 功能需要专业版及以上套餐', 403)
    }
    if (!hasPermission(auth.role, 'settings:manage')) return errorResponse(ErrorCodes.FORBIDDEN, '权限不足', 403)

    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { id, ...tenantWhere(auth.tenantId) },
    })

    if (!endpoint) {
      return errorResponse(ErrorCodes.NOT_FOUND, 'Webhook 端点不存在', 404)
    }

    await prisma.webhookEndpoint.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (error) {
    return handleApiError(error)
  }
}
