import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/contacts/[id]/360
 *
 * 360 度客户全景视图。
 * 返回联系人基本信息、邮件记录、关联的 Campaign、Deals、Tasks 以及海关买家画像（如有）。
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const { id } = await ctx.params

    // 获取联系人详情（含关联数据）
    const contact = await prisma.contact.findFirst({
      where: { id, tenantId: auth.tenantId },
      include: {
        emails: true,
        company: true,
        deals: { orderBy: { createdAt: 'desc' } },
        tasks: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })

    if (!contact) {
      return errorResponse(ErrorCodes.NOT_FOUND, '联系人不存在或无权访问', 404)
    }

    // 获取邮件日志（最近 50 条）
    const emailLogs = await prisma.emailLog.findMany({
      where: { contactId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // 获取关联的 Campaign
    const campaigns = await prisma.campaignContact.findMany({
      where: { contactId: id },
      include: {
        campaign: {
          select: { id: true, name: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 如果联系人关联了公司，尝试获取海关买家画像
    let customsProfile = null
    if (contact.company?.domain) {
      customsProfile = await prisma.customsBuyerProfile.findFirst({
        where: {
          tenantId: auth.tenantId,
          domain: contact.company.domain,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        contact,
        emailLogs,
        campaigns: campaigns.map(cc => cc.campaign),
        deals: contact.deals,
        tasks: contact.tasks,
        customsProfile,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
