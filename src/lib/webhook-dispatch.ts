import crypto from 'crypto'
import { prisma } from './prisma'

export type WebhookEvent =
  | 'campaign.completed'
  | 'campaign.started'
  | 'reply.received'
  | 'contact.created'
  | 'deal.won'
  | 'deal.lost'

interface WebhookPayload {
  event: WebhookEvent
  tenantId: string
  data: Record<string, unknown>
  timestamp: string
}

/**
 * Dispatch a webhook event to all matching endpoints for a tenant.
 * Fire-and-forget — never throws.
 */
export async function dispatchWebhook(tenantId: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: {
        tenantId,
        isActive: true,
        events: { has: event },
      },
    })

    if (endpoints.length === 0) return

    const payload: WebhookPayload = {
      event,
      tenantId,
      data,
      timestamp: new Date().toISOString(),
    }

    for (const endpoint of endpoints) {
      // Fire-and-forget delivery
      deliverWebhook(endpoint.id, endpoint.url, endpoint.secret, payload).catch(() => {})
    }
  } catch (error) {
    console.error('[Webhook] Dispatch failed:', error)
  }
}

/**
 * Deliver a webhook payload to a single endpoint with HMAC signature.
 */
async function deliverWebhook(endpointId: string, url: string, secret: string, payload: WebhookPayload): Promise<void> {
  const body = JSON.stringify(payload)
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex')

  const maxAttempts = 3
  let lastError: string | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
          'X-Webhook-Event': payload.event,
          'X-Webhook-Delivery': `${endpointId}-${Date.now()}`,
        },
        body,
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      // Log delivery
      await prisma.webhookDelivery.create({
        data: {
          endpointId,
          event: payload.event,
          payload: payload as any,
          status: res.ok ? 'success' : 'failed',
          statusCode: res.status,
          responseBody: await res.text().catch(() => ''),
          attempts: attempt,
        },
      })

      if (res.ok) {
        // Reset failure count
        await prisma.webhookEndpoint.update({
          where: { id: endpointId },
          data: { lastTriggeredAt: new Date(), failureCount: 0 },
        })
        return
      }

      lastError = `HTTP ${res.status}`
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
    }

    // Exponential backoff: 1s, 4s
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }

  // All attempts failed
  await prisma.webhookDelivery.create({
    data: {
      endpointId,
      event: payload.event,
      payload: payload as any,
      status: 'failed',
      responseBody: lastError || 'Max retries exceeded',
      attempts: maxAttempts,
    },
  })

  // Increment failure count
  await prisma.webhookEndpoint.update({
    where: { id: endpointId },
    data: { failureCount: { increment: 1 } },
  }).catch(() => {})
}

/**
 * Send a test payload directly to a specific endpoint (ignores event subscription filter).
 */
export async function sendTestWebhookToEndpoint(endpointId: string): Promise<void> {
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id: endpointId },
  })

  if (!endpoint || !endpoint.isActive || !endpoint.tenantId) return

  const event = (endpoint.events[0] || 'campaign.completed') as WebhookEvent
  const payload: WebhookPayload = {
    event,
    tenantId: endpoint.tenantId,
    data: { test: true, message: 'This is a test webhook' },
    timestamp: new Date().toISOString(),
  }

  await deliverWebhook(endpoint.id, endpoint.url, endpoint.secret, payload)
}

/**
 * Sign a webhook payload for verification.
 */
export function signWebhook(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}
