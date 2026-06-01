import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    console.warn('[Stripe] STRIPE_SECRET_KEY not configured')
    return null
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, { apiVersion: '2026-05-27.dahlia' })
  }
  return stripeInstance
}

// Price ID mapping — set these in .env
export const STRIPE_PRICES: Record<string, string> = {
  PRO: process.env.STRIPE_PRICE_PRO || '',
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || '',
}

export function getPriceId(plan: string): string | null {
  const id = STRIPE_PRICES[plan]
  return id || null
}
