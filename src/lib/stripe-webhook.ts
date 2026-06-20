import Stripe from 'stripe'
import { prisma } from './prisma'
import { syncTenantLimits } from './plan-limits'

export type BillingPlan = 'PRO' | 'ENTERPRISE' | 'FREE'
export type StripeEventClaim = 'claimed' | 'processed' | 'processing'

const EVENT_LEASE_MS = 5 * 60 * 1000

export function resolvePlanFromSubscription(
  sub: Stripe.Subscription
): BillingPlan | null {
  if (sub.status !== 'active' && sub.status !== 'trialing') {
    return 'FREE'
  }

  const priceId = sub.items?.data?.[0]?.price?.id || ''
  if (
    process.env.STRIPE_PRICE_ENTERPRISE &&
    priceId === process.env.STRIPE_PRICE_ENTERPRISE
  ) {
    return 'ENTERPRISE'
  }
  if (
    process.env.STRIPE_PRICE_PRO &&
    priceId === process.env.STRIPE_PRICE_PRO
  ) {
    return 'PRO'
  }

  return null
}

function extractCustomerId(sub: Stripe.Subscription): string {
  return typeof sub.customer === 'string' ? sub.customer : sub.customer.id
}

function settingsRecord(settings: unknown): Record<string, unknown> {
  return settings && typeof settings === 'object'
    ? { ...(settings as Record<string, unknown>) }
    : {}
}

function storedEventCreated(settings: Record<string, unknown>): number {
  const value = settings.stripeSubscriptionEventCreated
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
  )
}

function sanitizedError(error: unknown): string {
  const source =
    error instanceof Error
      ? error.name + ': ' + error.message
      : 'Unknown handler error'

  return source
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      '[redacted-email]'
    )
    .replace(
      /\b(?:sk|rk|whsec)_[A-Za-z0-9_]+\b/g,
      '[redacted-secret]'
    )
    .replace(
      /\b(?:cus|sub|pm|pi|ch)_[A-Za-z0-9_]+\b/g,
      '[redacted-stripe-id]'
    )
    .slice(0, 500)
}

async function findTenantByCustomerId(customerId: string) {
  return prisma.tenant.findFirst({
    where: {
      settings: { path: ['stripeCustomerId'], equals: customerId },
    },
    select: { id: true, plan: true, settings: true },
  })
}

export async function claimStripeEvent(
  eventId: string,
  eventType: string,
  now = new Date()
): Promise<StripeEventClaim> {
  try {
    await prisma.processedStripeEvent.create({
      data: {
        eventId,
        eventType,
        status: 'processing',
        attempts: 1,
      },
    })
    return 'claimed'
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
  }

  const existing = await prisma.processedStripeEvent.findUnique({
    where: { eventId },
    select: { status: true, updatedAt: true },
  })
  if (!existing) {
    throw new Error(
      'Stripe event claim conflicted but no event row was found'
    )
  }
  if (existing.status === 'processed') return 'processed'

  const staleBefore = new Date(now.getTime() - EVENT_LEASE_MS)
  if (
    existing.status === 'processing' &&
    existing.updatedAt.getTime() >= staleBefore.getTime()
  ) {
    return 'processing'
  }

  const claimed = await prisma.processedStripeEvent.updateMany({
    where: {
      eventId,
      status: existing.status,
      ...(existing.status === 'processing'
        ? { updatedAt: { lt: staleBefore } }
        : {}),
    },
    data: {
      status: 'processing',
      eventType,
      attempts: { increment: 1 },
      error: null,
      processedAt: null,
    },
  })

  return claimed.count === 1 ? 'claimed' : 'processing'
}

export async function markStripeEventProcessed(
  eventId: string
): Promise<void> {
  const result = await prisma.processedStripeEvent.updateMany({
    where: { eventId, status: 'processing' },
    data: {
      status: 'processed',
      error: null,
      processedAt: new Date(),
    },
  })
  if (result.count !== 1) {
    throw new Error('Stripe event processing lease was lost')
  }
}

export async function markStripeEventFailed(
  eventId: string,
  error: unknown
): Promise<void> {
  await prisma.processedStripeEvent.updateMany({
    where: { eventId, status: 'processing' },
    data: {
      status: 'failed',
      error: sanitizedError(error),
      processedAt: null,
    },
  })
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  eventCreated: number
): Promise<void> {
  const tenantId = session.metadata?.tenantId
  const plan = session.metadata?.plan
  if (!tenantId || (plan !== 'PRO' && plan !== 'ENTERPRISE')) return

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, settings: true },
  })
  if (!tenant) return

  const settings = settingsRecord(tenant.settings)
  const incomingSubscriptionId = session.subscription
    ? typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription.id
    : undefined
  const currentSubscriptionId = settings.stripeSubscriptionId
  const lastEventCreated = storedEventCreated(settings)

  if (
    currentSubscriptionId &&
    incomingSubscriptionId &&
    currentSubscriptionId !== incomingSubscriptionId &&
    lastEventCreated > eventCreated
  ) {
    return
  }

  if (incomingSubscriptionId) {
    settings.stripeSubscriptionId = incomingSubscriptionId
  }
  if (session.customer) {
    settings.stripeCustomerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer.id
  }
  settings.stripeSubscriptionEventCreated = eventCreated

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      plan,
      settings: settings as any,
    },
  })
  await syncTenantLimits(tenantId, plan)
  console.log('[Stripe] Checkout applied', { tenantId, plan })
}

async function handleSubscriptionUpdated(
  sub: Stripe.Subscription,
  eventCreated: number
): Promise<void> {
  const tenant = await findTenantByCustomerId(extractCustomerId(sub))
  if (!tenant) return

  const settings = settingsRecord(tenant.settings)
  const currentSubscriptionId = settings.stripeSubscriptionId
  if (currentSubscriptionId && currentSubscriptionId !== sub.id) return
  if (
    currentSubscriptionId === sub.id &&
    storedEventCreated(settings) > eventCreated
  ) {
    return
  }

  const newPlan = resolvePlanFromSubscription(sub)
  if (!newPlan) {
    throw new Error(
      'No configured plan matches the active subscription price'
    )
  }

  settings.stripeSubscriptionId = sub.id
  settings.stripeSubscriptionStatus = sub.status
  settings.stripeSubscriptionEventCreated = eventCreated

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      plan: newPlan,
      settings: settings as any,
    },
  })
  await syncTenantLimits(tenant.id, newPlan)
  console.log('[Stripe] Subscription status applied', {
    tenantId: tenant.id,
    plan: newPlan,
    status: sub.status,
  })
}

async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
  eventCreated: number
): Promise<void> {
  const tenant = await findTenantByCustomerId(extractCustomerId(sub))
  if (!tenant) return

  const settings = settingsRecord(tenant.settings)
  const currentSubscriptionId = settings.stripeSubscriptionId
  if (currentSubscriptionId && currentSubscriptionId !== sub.id) return
  if (
    currentSubscriptionId === sub.id &&
    storedEventCreated(settings) > eventCreated
  ) {
    return
  }

  settings.stripeSubscriptionStatus = 'canceled'
  settings.stripeSubscriptionEventCreated = eventCreated
  delete settings.stripeSubscriptionId

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      plan: 'FREE',
      settings: settings as any,
    },
  })
  await syncTenantLimits(tenant.id, 'FREE')
  console.log('[Stripe] Subscription deletion applied', {
    tenantId: tenant.id,
  })
}

export async function handleStripeEvent(
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session,
        event.created
      )
      return
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(
        event.data.object as Stripe.Subscription,
        event.created
      )
      return
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(
        event.data.object as Stripe.Subscription,
        event.created
      )
      return
    default:
      return
  }
}
