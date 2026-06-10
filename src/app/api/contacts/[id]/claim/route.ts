import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { writeAuditLog, getAuditRequestMeta } from '@/lib/audit'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * POST /api/contacts/[id]/claim
 *
 * 从公海领取联系人到私海。
 * 条件：联系人必须处于公海（pool === 'PUBLIC' 或 ownerId === null）。
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
    if (contact.pool === 'PRIVATE' && contact.ownerId) {
      return errorResponse(ErrorCodes.CONFLICT, '该联系人已被其他人领取', 409)
    }

    // 领取联系人（where 带 tenantId 防止跨租户操作）
    const updated = await prisma.contact.update({
      where: { id, tenantId: auth.tenantId },
      data: {
        ownerId: auth.userId,
        pool: 'PRIVATE',
        claimedAt: new Date(),
        lastActivityAt: new Date(),
      },
      include: { emails: true, company: true },
    })

    // 审计日志
    const meta = getAuditRequestMeta(req)
    writeAuditLog({
      userId: auth.userId!,
      tenantId: auth.tenantId,
      action: 'claim_contact',
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
