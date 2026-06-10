import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission, isAdmin } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { writeAuditLog, getAuditRequestMeta } from '@/lib/audit'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * POST /api/contacts/[id]/release
 *
 * 将私海联系人释放回公海。
 * 条件：当前用户是联系人 owner，或用户是 ADMIN/OWNER 角色。
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    if (!hasPermission(auth.role, 'contacts:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要客户管理权限', 403)
    }

    const { id } = await ctx.params

    // 查找联系人并验证归属
    const contact = await prisma.contact.findFirst({
      where: { id, tenantId: auth.tenantId },
    })

    if (!contact) {
      return errorResponse(ErrorCodes.NOT_FOUND, '联系人不存在或无权访问', 404)
    }

    // 检查是否已在公海
    if (contact.pool === 'PUBLIC' && !contact.ownerId) {
      return errorResponse(ErrorCodes.CONFLICT, '该联系人已在公海', 409)
    }

    // 只有 owner 或管理员可以释放
    if (contact.ownerId !== auth.userId && !isAdmin(auth.role)) {
      return errorResponse(ErrorCodes.FORBIDDEN, '只能释放自己领取的联系人', 403)
    }

    // 释放联系人回公海（where 带 tenantId 防止跨租户操作）
    const updated = await prisma.contact.update({
      where: { id, tenantId: auth.tenantId },
      data: {
        ownerId: null,
        pool: 'PUBLIC',
        claimedAt: null,
      },
      include: { emails: true, company: true },
    })

    // 审计日志
    const meta = getAuditRequestMeta(req)
    writeAuditLog({
      userId: auth.userId!,
      tenantId: auth.tenantId,
      action: 'release_contact',
      resource: 'contact',
      resourceId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    }).catch(() => {})

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
