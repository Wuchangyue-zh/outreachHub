import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { getStripe, getPriceId } from '@/lib/stripe'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

export async function POST(req: NextRequest) {
  const rateLimitResult = await limiter.check(req, 5)
  if (rateLimitResult) return rateLimitResult
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

    const body = await req.json()
    const { plan } = body as { plan?: string }

    if (!plan || !['PRO', 'ENTERPRISE'].includes(plan)) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '无效的套餐类型，仅支持 PRO 或 ENTERPRISE', 400)
    }

    const priceId = getPriceId(plan)
    if (!priceId) {
      return errorResponse(ErrorCodes.EXTERNAL_API_ERROR, `套餐 ${plan} 的价格 ID 未配置`, 503)
    }

    // Fetch tenant + first user for customer info
    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.tenantId },
      select: { id: true, name: true, settings: true, users: { select: { email: true }, take: 1 } },
    })
    if (!tenant) return errorResponse(ErrorCodes.NOT_FOUND, '租户不存在', 404)

    const settings = (tenant.settings as Record<string, unknown>) || {}
    let customerId = settings.stripeCustomerId as string | undefined

    // Get or create Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.users[0]?.email,
        name: tenant.name,
        metadata: { tenantId: tenant.id },
      })
      customerId = customer.id

      // Persist stripeCustomerId in tenant.settings
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { settings: { ...settings, stripeCustomerId: customerId } as any },
      })
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3030'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/settings?billing=success`,
      cancel_url: `${appUrl}/dashboard/settings?billing=cancel`,
      metadata: { tenantId: tenant.id, plan },
    })

    return NextResponse.json({ success: true, data: { url: session.url } })
  } catch (error) {
    return handleApiError(error)
  }
}
