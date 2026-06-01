import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAuth, hasPermission, tenantWhere } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { sendTestWebhookToEndpoint } from '@/lib/webhook-dispatch'
import { isProOrAbove } from '@/lib/plan-limits'

/**
 * POST /api/webhooks/[id]/test — Send a test webhook event.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    await sendTestWebhookToEndpoint(endpoint.id)

    return NextResponse.json({
      success: true,
      data: { message: '测试事件已发送', endpointId: id },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
