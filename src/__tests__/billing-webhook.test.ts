/**
 * P2-2: Stripe webhook state transitions and idempotency.
 */

const mockPrisma = {
  tenant: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  processedStripeEvent: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
}

const mockConstructEvent = jest.fn()
const mockSyncTenantLimits = jest.fn()
const mockStripe = {
  webhooks: { constructEvent: mockConstructEvent },
}

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
jest.mock('@/lib/stripe', () => ({ getStripe: () => mockStripe }))
jest.mock('@/lib/plan-limits', () => ({
  syncTenantLimits: (...args: any[]) => mockSyncTenantLimits(...args),
}))

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/billing/webhook/route'
import {
  claimStripeEvent,
  resolvePlanFromSubscription,
} from '@/lib/stripe-webhook'

const NOW_SECONDS = 1_750_000_000

function subscription(
  status: string,
  priceId = 'price_pro',
  overrides: Record<string, unknown> = {}
) {
  return {
    id: 'sub_current',
    customer: 'cus_tenant',
    status,
    items: { data: [{ price: { id: priceId } }] },
    ...overrides,
  } as any
}

function event(
  type: string,
  object: Record<string, unknown>,
  overrides: Record<string, unknown> = {}
) {
  return {
    id: 'evt_1',
    type,
    created: NOW_SECONDS,
    data: { object },
    ...overrides,
  } as any
}

function request() {
  return new NextRequest('http://localhost/api/billing/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'valid-signature' },
    body: '{}',
  })
}

function p2002() {
  return Object.assign(new Error('Unique constraint'), { code: 'P2002' })
}

function tenant(
  plan = 'PRO',
  settings: Record<string, unknown> = {
    stripeCustomerId: 'cus_tenant',
    stripeSubscriptionId: 'sub_current',
  }
) {
  return { id: 'tenant_1', plan, settings }
}

describe('P2-2 Stripe webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    process.env.STRIPE_PRICE_PRO = 'price_pro'
    process.env.STRIPE_PRICE_ENTERPRISE = 'price_enterprise'

    mockPrisma.processedStripeEvent.create.mockResolvedValue({
      id: 'claim_1',
    })
    mockPrisma.processedStripeEvent.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.tenant.findFirst.mockResolvedValue(tenant())
    mockPrisma.tenant.findUnique.mockResolvedValue(tenant())
    mockPrisma.tenant.update.mockResolvedValue(tenant())
    mockSyncTenantLimits.mockResolvedValue(undefined)
    mockConstructEvent.mockReturnValue(
      event(
        'customer.subscription.updated',
        subscription('active')
      )
    )
  })

  afterAll(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    delete process.env.STRIPE_PRICE_PRO
    delete process.env.STRIPE_PRICE_ENTERPRISE
  })

  it.each([
    ['active', 'price_pro', 'PRO'],
    ['trialing', 'price_enterprise', 'ENTERPRISE'],
    ['past_due', 'price_pro', 'FREE'],
    ['unpaid', 'price_pro', 'FREE'],
    ['canceled', 'price_pro', 'FREE'],
    ['paused', 'price_pro', 'FREE'],
    ['incomplete', 'price_pro', 'FREE'],
    ['incomplete_expired', 'price_pro', 'FREE'],
  ])('maps %s with %s to %s', (status, priceId, expected) => {
    expect(resolvePlanFromSubscription(subscription(status, priceId))).toBe(
      expected
    )
  })

  it('does not grant a paid plan for an unknown active price', () => {
    expect(
      resolvePlanFromSubscription(subscription('active', 'price_unknown'))
    ).toBeNull()
  })

  it('rejects an invalid signature before touching the database', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('invalid signature')
    })

    const response = await POST(request())

    expect(response.status).toBe(400)
    expect(mockPrisma.processedStripeEvent.create).not.toHaveBeenCalled()
    expect(mockPrisma.tenant.update).not.toHaveBeenCalled()
  })

  it('applies an active PRO subscription through the real route', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tenant_1' },
        data: expect.objectContaining({ plan: 'PRO' }),
      })
    )
    expect(mockSyncTenantLimits).toHaveBeenCalledWith('tenant_1', 'PRO')
    expect(mockPrisma.processedStripeEvent.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'processed' }),
      })
    )
  })

  it('downgrades past_due and synchronizes FREE limits', async () => {
    mockConstructEvent.mockReturnValue(
      event(
        'customer.subscription.updated',
        subscription('past_due')
      )
    )

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ plan: 'FREE' }),
      })
    )
    expect(mockSyncTenantLimits).toHaveBeenCalledWith('tenant_1', 'FREE')
  })

  it('fails safely when an active subscription price is unknown', async () => {
    mockConstructEvent.mockReturnValue(
      event(
        'customer.subscription.updated',
        subscription('active', 'price_unknown')
      )
    )

    const response = await POST(request())

    expect(response.status).toBe(500)
    expect(mockPrisma.tenant.update).not.toHaveBeenCalled()
    expect(mockPrisma.processedStripeEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed' }),
      })
    )
  })

  it('skips a processed duplicate before applying side effects', async () => {
    mockPrisma.processedStripeEvent.create.mockRejectedValue(p2002())
    mockPrisma.processedStripeEvent.findUnique.mockResolvedValue({
      status: 'processed',
      updatedAt: new Date(),
    })

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ duplicate: true })
    expect(mockPrisma.tenant.update).not.toHaveBeenCalled()
  })

  it('returns a retryable conflict for a concurrent processing delivery', async () => {
    mockPrisma.processedStripeEvent.create.mockRejectedValue(p2002())
    mockPrisma.processedStripeEvent.findUnique.mockResolvedValue({
      status: 'processing',
      updatedAt: new Date(),
    })

    const response = await POST(request())

    expect(response.status).toBe(409)
    expect(mockPrisma.tenant.update).not.toHaveBeenCalled()
  })

  it('atomically reclaims a failed event without deleting its row', async () => {
    mockPrisma.processedStripeEvent.create.mockRejectedValue(p2002())
    mockPrisma.processedStripeEvent.findUnique.mockResolvedValue({
      status: 'failed',
      updatedAt: new Date(),
    })

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mockPrisma.processedStripeEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: 'evt_1',
          status: 'failed',
        }),
        data: expect.objectContaining({
          status: 'processing',
          attempts: { increment: 1 },
        }),
      })
    )
    expect(mockPrisma.tenant.update).toHaveBeenCalledTimes(1)
  })

  it('allows only one request to perform side effects concurrently', async () => {
    let releaseUpdate: (() => void) | undefined
    const pendingUpdate = new Promise<void>((resolve) => {
      releaseUpdate = resolve
    })

    mockPrisma.processedStripeEvent.create
      .mockResolvedValueOnce({ id: 'claim_1' })
      .mockRejectedValueOnce(p2002())
    mockPrisma.tenant.update.mockImplementationOnce(() => pendingUpdate)
    mockPrisma.processedStripeEvent.findUnique.mockResolvedValue({
      status: 'processing',
      updatedAt: new Date(),
    })

    const first = POST(request())
    await new Promise((resolve) => setTimeout(resolve, 0))
    const second = await POST(request())

    expect(second.status).toBe(409)
    expect(mockPrisma.tenant.update).toHaveBeenCalledTimes(1)

    releaseUpdate?.()
    const firstResponse = await first
    expect(firstResponse.status).toBe(200)
    expect(mockPrisma.tenant.update).toHaveBeenCalledTimes(1)
  })

  it('reclaims a stale processing lease', async () => {
    mockPrisma.processedStripeEvent.create.mockRejectedValue(p2002())
    mockPrisma.processedStripeEvent.findUnique.mockResolvedValue({
      status: 'processing',
      updatedAt: new Date('2020-01-01'),
    })

    const result = await claimStripeEvent(
      'evt_stale',
      'customer.subscription.updated',
      new Date('2020-01-02')
    )

    expect(result).toBe('claimed')
    expect(mockPrisma.processedStripeEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: 'evt_stale',
          status: 'processing',
          updatedAt: { lt: expect.any(Date) },
        }),
      })
    )
  })

  it('does not swallow a non-unique claim database failure', async () => {
    mockPrisma.processedStripeEvent.create.mockRejectedValue(
      new Error('database unavailable')
    )

    const response = await POST(request())

    expect(response.status).toBe(500)
    expect(mockPrisma.tenant.update).not.toHaveBeenCalled()
  })

  it('skips an event for an older subscription id', async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue(
      tenant('PRO', {
        stripeCustomerId: 'cus_tenant',
        stripeSubscriptionId: 'sub_new',
      })
    )
    mockConstructEvent.mockReturnValue(
      event(
        'customer.subscription.updated',
        subscription('past_due', 'price_pro', { id: 'sub_old' })
      )
    )

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mockPrisma.tenant.update).not.toHaveBeenCalled()
  })

  it('skips an out-of-order event for the current subscription', async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue(
      tenant('PRO', {
        stripeCustomerId: 'cus_tenant',
        stripeSubscriptionId: 'sub_current',
        stripeSubscriptionEventCreated: NOW_SECONDS + 100,
      })
    )

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mockPrisma.tenant.update).not.toHaveBeenCalled()
  })

  it('clears a deleted subscription even when the tenant is already FREE', async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue(
      tenant('FREE', {
        stripeCustomerId: 'cus_tenant',
        stripeSubscriptionId: 'sub_current',
      })
    )
    mockConstructEvent.mockReturnValue(
      event(
        'customer.subscription.deleted',
        subscription('canceled')
      )
    )

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plan: 'FREE',
          settings: expect.not.objectContaining({
            stripeSubscriptionId: expect.anything(),
          }),
        }),
      })
    )
  })

  it('records a redacted error and permits a later retry', async () => {
    mockPrisma.tenant.update
      .mockRejectedValueOnce(
        new Error('failed for person@example.com with cus_secret')
      )
      .mockResolvedValueOnce(tenant())

    const failedResponse = await POST(request())
    expect(failedResponse.status).toBe(500)
    expect(mockPrisma.processedStripeEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'failed',
          error: expect.stringContaining('[redacted-email]'),
        }),
      })
    )

    jest.clearAllMocks()
    mockConstructEvent.mockReturnValue(
      event(
        'customer.subscription.updated',
        subscription('active')
      )
    )
    mockPrisma.processedStripeEvent.create.mockRejectedValue(p2002())
    mockPrisma.processedStripeEvent.findUnique.mockResolvedValue({
      status: 'failed',
      updatedAt: new Date(),
    })
    mockPrisma.processedStripeEvent.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.tenant.findFirst.mockResolvedValue(tenant())
    mockPrisma.tenant.update.mockResolvedValue(tenant())
    mockSyncTenantLimits.mockResolvedValue(undefined)

    const retryResponse = await POST(request())
    expect(retryResponse.status).toBe(200)
    expect(mockPrisma.tenant.update).toHaveBeenCalledTimes(1)
  })

  it('applies checkout completion and records the subscription identifiers', async () => {
    mockConstructEvent.mockReturnValue(
      event('checkout.session.completed', {
        metadata: { tenantId: 'tenant_1', plan: 'ENTERPRISE' },
        subscription: 'sub_checkout',
        customer: 'cus_tenant',
      })
    )

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          plan: 'ENTERPRISE',
          settings: expect.objectContaining({
            stripeSubscriptionId: 'sub_checkout',
            stripeCustomerId: 'cus_tenant',
          }),
        }),
      })
    )
  })
})
