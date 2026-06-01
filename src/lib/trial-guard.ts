import { prisma } from './prisma'

export interface TrialCheckResult {
  allowed: boolean
  trialExpired: boolean
  trialEndsAt: Date | null
  daysRemaining: number | null
  plan: string
}

/**
 * Check if tenant's trial has expired. Paid plans are always allowed.
 * Returns trial status for UI display.
 */
export async function checkTrialStatus(tenantId: string): Promise<TrialCheckResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, trialStartedAt: true, trialEndsAt: true }
  })

  if (!tenant) {
    return { allowed: false, trialExpired: true, trialEndsAt: null, daysRemaining: null, plan: 'FREE' }
  }

  // Paid plans are always allowed
  if (tenant.plan !== 'FREE') {
    return { allowed: true, trialExpired: false, trialEndsAt: tenant.trialEndsAt, daysRemaining: null, plan: tenant.plan }
  }

  // No trial dates set (legacy account) — allow
  if (!tenant.trialEndsAt) {
    return { allowed: true, trialExpired: false, trialEndsAt: null, daysRemaining: null, plan: 'FREE' }
  }

  const now = new Date()
  const trialExpired = now > tenant.trialEndsAt
  const daysRemaining = Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  return {
    allowed: !trialExpired,
    trialExpired,
    trialEndsAt: tenant.trialEndsAt,
    daysRemaining,
    plan: tenant.plan
  }
}
