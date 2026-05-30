import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { getTenantLimits, getTenantUsage, syncTenantLimits } from '@/lib/plan-limits'

/**
 * GET /api/tenant/usage
 * 获取当前租户的套餐信息和用量统计
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const [tenant, limits, usage] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: auth.tenantId },
        select: { id: true, name: true, plan: true, expiresAt: true, createdAt: true },
      }),
      getTenantLimits(auth.tenantId),
      getTenantUsage(auth.tenantId),
    ])

    if (!tenant) return errorResponse(ErrorCodes.NOT_FOUND, '租户不存在', 404)

    // 获取团队成员列表
    const members = await prisma.user.findMany({
      where: { tenantId: auth.tenantId },
      select: { id: true, email: true, name: true, role: true, avatar: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // H3d: 获取待处理邀请
    const invitations = await prisma.invitation.findMany({
      where: { tenantId: auth.tenantId, status: 'PENDING' },
      select: { id: true, email: true, role: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          plan: tenant.plan,
          expiresAt: tenant.expiresAt,
          createdAt: tenant.createdAt,
        },
        limits,
        usage: {
          ...usage,
          contactPercent: limits.maxContacts > 0 ? Math.round((usage.contactCount / limits.maxContacts) * 100) : 0,
          emailPercent: limits.maxEmailsPerDay > 0 ? Math.round((usage.emailsSentToday / limits.maxEmailsPerDay) * 100) : 0,
          userPercent: limits.maxUsers > 0 ? Math.round((usage.userCount / limits.maxUsers) * 100) : 0,
        },
        members,
        invitations,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PATCH /api/tenant/usage
 * 套餐升级/变更（仅 ADMIN/OWNER）
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    if (!hasPermission(auth.role, 'settings:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要设置管理权限', 403)
    }

    const body = await req.json()
    const { plan } = body
    const validPlans = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE']
    if (!plan || !validPlans.includes(plan)) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, `无效套餐，可选：${validPlans.join(', ')}`, 400)
    }

    // 更新套餐
    await prisma.tenant.update({
      where: { id: auth.tenantId },
      data: { plan },
    })

    // I1: 同步限额
    await syncTenantLimits(auth.tenantId, plan)

    const [limits, usage] = await Promise.all([
      getTenantLimits(auth.tenantId),
      getTenantUsage(auth.tenantId),
    ])

    return NextResponse.json({
      success: true,
      data: { plan, limits, usage },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
