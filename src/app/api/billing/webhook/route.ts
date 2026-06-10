import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { getStripe } from '@/lib/stripe'
import { syncTenantLimits } from '@/lib/plan-limits'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // Must use raw text for signature verification
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Stripe Webhook] Signature verification failed:', message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const tenantId = session.metadata?.tenantId
        const plan = session.metadata?.plan

        if (tenantId && plan && ['PRO', 'ENTERPRISE'].includes(plan)) {
          const settings: Record<string, unknown> = {}
          if (session.subscription) settings.stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
          if (session.customer) settings.stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer.id

          // Merge with existing settings
          const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } })
          const existing = (tenant?.settings as Record<string, unknown>) || {}

          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              plan: plan as 'PRO' | 'ENTERPRISE',
              settings: { ...existing, ...settings } as any,
            },
          })
          await syncTenantLimits(tenantId, plan)
          console.log(`[Stripe Webhook] Tenant ${tenantId} upgraded to ${plan}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

        // Find tenant by stripeCustomerId in settings
        const tenant = await prisma.tenant.findFirst({
          where: {
            settings: {
              path: ['stripeCustomerId'],
              equals: customerId,
            },
          },
        })

        if (tenant) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { plan: 'FREE' },
          })
          await syncTenantLimits(tenant.id, 'FREE')
          console.log(`[Stripe Webhook] Tenant ${tenant.id} downgraded to FREE (subscription deleted)`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`[Stripe Webhook] Subscription ${subscription.id} updated, status: ${subscription.status}`)
        // Future: handle past_due, canceled status transitions
        break
      }

      default:
        // Unhandled event type — log and ignore
        break
    }
  } catch (err) {
    console.error('[Stripe Webhook] Handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
