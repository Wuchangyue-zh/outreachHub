import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { getTenantLimits, getTenantUsage } from '@/lib/plan-limits'

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
