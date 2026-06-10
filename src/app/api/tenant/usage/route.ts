import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { getTenantLimits, getTenantUsage } from '@/lib/plan-limits'
import { LANGUAGES } from '@/lib/i18n/languages'

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
        select: {
          id: true,
          name: true,
          plan: true,
          expiresAt: true,
          createdAt: true,
          settings: true,
          trialStartedAt: true,
          trialEndsAt: true,
        },
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
          trialStartedAt: tenant.trialStartedAt,
          trialEndsAt: tenant.trialEndsAt,
          language: ((tenant.settings as Record<string, unknown>)?.language as string) || 'zh',
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
    const { language } = body

    const updateData: Record<string, unknown> = {}

    // R1: 套餐变更仅允许通过 Stripe Webhook，禁止 API 手动升级
    if (body.plan !== undefined) {
      return errorResponse(ErrorCodes.FORBIDDEN, '套餐变更请通过订阅结账或 Stripe 客户门户完成', 403)
    }

    // K6: 语言设置（写入 tenant.settings.language）
    if (language !== undefined) {
      const validLangs = LANGUAGES.map((l) => l.code)
      if (!validLangs.includes(language)) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, `无效语言，可选：${validLangs.join(', ')}`, 400)
      }
      const tenant = await prisma.tenant.findUnique({
        where: { id: auth.tenantId },
        select: { settings: true },
      })
      const currentSettings = (tenant?.settings as Record<string, unknown>) || {}
      updateData.settings = { ...currentSettings, language }
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '请提供要更新的字段', 400)
    }

    await prisma.tenant.update({
      where: { id: auth.tenantId },
      data: updateData,
    })

    const [limits, usage, updatedTenant] = await Promise.all([
      getTenantLimits(auth.tenantId),
      getTenantUsage(auth.tenantId),
      prisma.tenant.findUnique({
        where: { id: auth.tenantId },
        select: { plan: true, settings: true },
      }),
    ])

    const savedLanguage = ((updatedTenant?.settings as Record<string, unknown>)?.language as string) || 'zh'

    return NextResponse.json({
      success: true,
      data: {
        plan: updatedTenant?.plan,
        language: language !== undefined ? savedLanguage : undefined,
        limits,
        usage,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
