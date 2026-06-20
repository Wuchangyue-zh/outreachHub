import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import {
  claimStripeEvent,
  handleStripeEvent,
  markStripeEventFailed,
  markStripeEventProcessed,
  type StripeEventClaim,
} from '@/lib/stripe-webhook'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[Stripe] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )
  } catch {
    console.error('[Stripe] Signature verification failed')
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    )
  }

  let claim: StripeEventClaim
  try {
    claim = await claimStripeEvent(event.id, event.type)
  } catch {
    console.error('[Stripe] Failed to claim webhook event', {
      eventId: event.id,
      eventType: event.type,
    })
    return NextResponse.json(
      { error: 'Webhook idempotency unavailable' },
      { status: 500 }
    )
  }

  if (claim === 'processed') {
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (claim === 'processing') {
    return NextResponse.json(
      { received: false, processing: true },
      { status: 409 }
    )
  }

  try {
    await handleStripeEvent(event)
    await markStripeEventProcessed(event.id)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Stripe] Handler failed', {
      eventId: event.id,
      eventType: event.type,
      errorType: error instanceof Error ? error.name : 'UnknownError',
    })
    try {
      await markStripeEventFailed(event.id, error)
    } catch {
      console.error('[Stripe] Failed to mark event as failed', {
        eventId: event.id,
      })
    }
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
