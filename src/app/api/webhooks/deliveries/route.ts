import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { isProOrAbove } from '@/lib/plan-limits'

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, 'no tenant', 403)
    if (!isProOrAbove(auth.tenantId)) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'PRO plan required', 403)
    }
    if (!hasPermission(auth.role, 'settings:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, 'forbidden', 403)
    }

    const { searchParams } = new URL(req.url)
    const endpointId = searchParams.get('endpointId') || undefined
    const status = searchParams.get('status') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)))

    const where: any = {
      endpoint: { tenantId: auth.tenantId },
    }
    if (endpointId) where.endpointId = endpointId
    if (status && ['pending', 'success', 'failed'].includes(status)) where.status = status

    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          endpointId: true,
          event: true,
          status: true,
          statusCode: true,
          attempts: true,
          nextRetryAt: true,
          createdAt: true,
          responseBody: true,
          endpoint: { select: { url: true } },
        },
      }),
      prisma.webhookDelivery.count({ where }),
    ])

    const items = deliveries.map((d) => ({
      id: d.id,
      endpointId: d.endpointId,
      endpointUrl: d.endpoint.url,
      event: d.event,
      status: d.status,
      statusCode: d.statusCode,
      attempts: d.attempts,
      nextRetryAt: d.nextRetryAt,
      createdAt: d.createdAt,
      responseSummary: d.responseBody ? d.responseBody.slice(0, 200) : null,
    }))

    return NextResponse.json({
      success: true,
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
