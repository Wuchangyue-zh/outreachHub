import { prisma } from './prisma'

export interface PlanLimits {
  maxContacts: number
  maxUsers: number
  maxEmailsPerDay: number
}

export interface UsageInfo {
  contactCount: number
  userCount: number
  emailsSentToday: number
  campaignCount: number
}

// 各套餐默认限额
const PLAN_DEFAULTS: Record<string, PlanLimits> = {
  FREE: { maxContacts: 1000, maxUsers: 1, maxEmailsPerDay: 100 },
  BASIC: { maxContacts: 10000, maxUsers: 3, maxEmailsPerDay: 500 },
  PRO: { maxContacts: 100000, maxUsers: 10, maxEmailsPerDay: 5000 },
  ENTERPRISE: { maxContacts: 1000000, maxUsers: 50, maxEmailsPerDay: 50000 },
}

/**
 * 获取租户的实际限额（优先用 Tenant 表自定义值，否则用套餐默认值）
 */
export async function getTenantLimits(tenantId: string): Promise<PlanLimits> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, maxContacts: true, maxUsers: true, maxEmailsPerDay: true },
  })
  if (!tenant) return PLAN_DEFAULTS.FREE

  const defaults = PLAN_DEFAULTS[tenant.plan] || PLAN_DEFAULTS.FREE
  // 以套餐默认值为准；Tenant 表字段可高于套餐（Enterprise 定制）
  return {
    maxContacts: Math.max(defaults.maxContacts, tenant.maxContacts),
    maxUsers: Math.max(defaults.maxUsers, tenant.maxUsers),
    maxEmailsPerDay: Math.max(defaults.maxEmailsPerDay, tenant.maxEmailsPerDay),
  }
}

/**
 * 获取租户当前用量
 */
export async function getTenantUsage(tenantId: string): Promise<UsageInfo> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [contactCount, userCount, campaignCount, emailsSentToday] = await Promise.all([
    prisma.contact.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId } }),
    prisma.campaign.count({ where: { tenantId } }),
    prisma.emailLog.count({
      where: {
        campaign: { tenantId },
        sentAt: { gte: todayStart },
        status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'] },
      },
    }),
  ])

  return { contactCount, userCount, emailsSentToday, campaignCount }
}

/**
 * 检查联系人数量是否超限
 */
export async function checkContactLimit(tenantId: string): Promise<{ allowed: boolean; current: number; max: number }> {
  const [limits, usage] = await Promise.all([
    getTenantLimits(tenantId),
    getTenantUsage(tenantId),
  ])
  return {
    allowed: usage.contactCount < limits.maxContacts,
    current: usage.contactCount,
    max: limits.maxContacts,
  }
}

/**
 * 检查用户数量是否超限（含待接受邀请）
 */
export async function checkUserLimit(tenantId: string): Promise<{ allowed: boolean; current: number; max: number }> {
  const [limits, usage, pendingInvites] = await Promise.all([
    getTenantLimits(tenantId),
    getTenantUsage(tenantId),
    prisma.invitation.count({ where: { tenantId, status: 'PENDING' } }),
  ])
  const reserved = usage.userCount + pendingInvites
  return {
    allowed: reserved < limits.maxUsers,
    current: usage.userCount,
    max: limits.maxUsers,
  }
}

/**
 * 检查今日发信量是否超限
 */
export async function checkDailyEmailLimit(tenantId: string, emailsToAdd: number): Promise<{ allowed: boolean; current: number; max: number }> {
  const [limits, usage] = await Promise.all([
    getTenantLimits(tenantId),
    getTenantUsage(tenantId),
  ])
  return {
    allowed: (usage.emailsSentToday + emailsToAdd) <= limits.maxEmailsPerDay,
    current: usage.emailsSentToday,
    max: limits.maxEmailsPerDay,
  }
}

/**
 * 检查租户套餐是否为 PRO 或 ENTERPRISE（开放 API 功能门槛）
 * FREE / BASIC → 返回 false；PRO / ENTERPRISE → true
 */
export async function isProOrAbove(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  })
  if (!tenant) return false
  return tenant.plan === 'PRO' || tenant.plan === 'ENTERPRISE'
}

/**
 * H3e: 套餐变更时同步 Tenant 表限额字段
 * 在注册、套餐升级/降级时调用，确保 Tenant 表的 maxContacts/maxUsers/maxEmailsPerDay 与当前 plan 一致。
 * 仅当 Tenant 表值小于套餐默认值时才更新（Enterprise 定制值不会被覆盖）。
 */
export async function syncTenantLimits(tenantId: string, plan: string): Promise<void> {
  const defaults = PLAN_DEFAULTS[plan] || PLAN_DEFAULTS.FREE
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { maxContacts: true, maxUsers: true, maxEmailsPerDay: true },
  })
  if (!tenant) return

  const updates: Record<string, number> = {}
  if (tenant.maxContacts < defaults.maxContacts) updates.maxContacts = defaults.maxContacts
  if (tenant.maxUsers < defaults.maxUsers) updates.maxUsers = defaults.maxUsers
  if (tenant.maxEmailsPerDay < defaults.maxEmailsPerDay) updates.maxEmailsPerDay = defaults.maxEmailsPerDay

  if (Object.keys(updates).length > 0) {
    await prisma.tenant.update({ where: { id: tenantId }, data: updates })
  }
}
