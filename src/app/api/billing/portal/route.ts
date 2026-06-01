import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    if (!hasPermission(auth.role, 'settings:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '无权管理订阅', 403)
    }

    const stripe = getStripe()
    if (!stripe) {
      return errorResponse(ErrorCodes.EXTERNAL_API_ERROR, 'Stripe 未配置', 503)
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.tenantId },
      select: { settings: true },
    })
    if (!tenant) return errorResponse(ErrorCodes.NOT_FOUND, '租户不存在', 404)

    const settings = (tenant.settings as Record<string, unknown>) || {}
    const customerId = settings.stripeCustomerId as string | undefined

    if (!customerId) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '未找到订阅信息，请先订阅套餐', 400)
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3030'

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard/settings`,
    })

    return NextResponse.json({ success: true, data: { url: session.url } })
  } catch (error) {
    return handleApiError(error)
  }
}
