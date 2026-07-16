import { NextResponse } from 'next/server'
import { prisma } from './prisma'
import { errorResponse, ErrorCodes } from './api-errors'

export interface TrialCheckResult {
  allowed: boolean
  trialExpired: boolean
  trialEndsAt: Date | null
  daysRemaining: number | null
  plan: string
}

// 与 launch 一致的试用期过期响应结构（HTTP 403 + 升级引导提示）
export function trialExpiredResponse(): NextResponse {
  return errorResponse(
    ErrorCodes.TRIAL_EXPIRED,
    '试用期已结束，请升级套餐以继续使用。访问 /pricing 查看套餐方案。',
    403
  )
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
