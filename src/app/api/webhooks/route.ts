import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { resolveAuth, hasPermission, tenantWhere } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { isProOrAbove } from '@/lib/plan-limits'

/**
 * GET /api/webhooks — List all webhook endpoints for the current tenant.
 * Requires PRO or ENTERPRISE plan.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuth(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '需要租户关联', 403)
    if (!(await isProOrAbove(auth.tenantId))) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Webhooks 功能需要专业版及以上套餐', 403)
    }

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: tenantWhere(auth.tenantId),
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
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: endpoints.map((endpoint) => ({
        ...endpoint,
        status: endpoint.isActive ? 'active' : 'inactive',
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/webhooks — Create a new webhook endpoint.
 * Returns the secret once — it is never shown again.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuth(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '需要租户关联', 403)
    if (!(await isProOrAbove(auth.tenantId))) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'Webhooks 功能需要专业版及以上套餐', 403)
    }
    if (!hasPermission(auth.role, 'settings:manage')) return errorResponse(ErrorCodes.FORBIDDEN, '权限不足', 403)

    const body = await req.json()
    const { url, events } = body

    if (!url || typeof url !== 'string') {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'url 为必填项', 400)
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'url 格式无效', 400)
    }

    if (!Array.isArray(events) || events.length === 0) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'events 为非空数组', 400)
    }

    const secret = crypto.randomBytes(32).toString('hex')

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        tenantId: auth.tenantId,
        url,
        events,
        secret,
      },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: endpoint,
      secret,
      warning: '请立即保存此密钥，后续将无法再次查看。',
    }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
