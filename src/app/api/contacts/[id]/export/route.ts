/**
 * J3: GDPR 联系人数据导出
 * GET /api/contacts/[id]/export
 * 导出联系人的所有关联数据（JSON 格式）
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    if (!hasPermission(auth.role, 'contacts:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要客户管理权限', 403)
    }

    const { id } = await ctx.params

    const contact = await prisma.contact.findFirst({
      where: { id, tenantId: auth.tenantId },
      include: {
        emails: true,
        company: {
          select: { id: true, name: true, domain: true, industry: true, country: true },
        },
      },
    })

    if (!contact) {
      return errorResponse(ErrorCodes.NOT_FOUND, '联系人不存在', 404)
    }

    // 获取关联的邮件日志（通过关系过滤确保租户隔离）
    const emailLogs = await prisma.emailLog.findMany({
      where: { contact: { id, tenantId: auth.tenantId } },
      select: {
        id: true,
        fromEmail: true,
        toEmail: true,
        subject: true,
        content: true,
        status: true,
        sentAt: true,
        openedAt: true,
        clickedAt: true,
        repliedAt: true,
        bouncedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // 获取关联的 Campaign（通过关系过滤确保租户隔离）
    const campaignContacts = await prisma.campaignContact.findMany({
      where: { contact: { id, tenantId: auth.tenantId } },
      include: {
        campaign: {
          select: { id: true, name: true, type: true, status: true, createdAt: true },
        },
      },
    })

    const exportData = {
      exportDate: new Date().toISOString(),
      contact: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        fullName: contact.fullName,
        title: contact.title,
        department: contact.department,
        seniority: contact.seniority,
        phones: contact.phones,
        linkedinUrl: contact.linkedinUrl,
        country: contact.country,
        countryCode: contact.countryCode,
        region: contact.region,
        city: contact.city,
        status: contact.status,
        tags: contact.tags,
        notes: contact.notes,
        unsubscribed: contact.unsubscribed,
        unsubscribedAt: contact.unsubscribedAt,
        aiProfile: contact.aiProfile,
        emailsSent: contact.emailsSent,
        emailsOpened: contact.emailsOpened,
        emailsReplied: contact.emailsReplied,
        emailsBounced: contact.emailsBounced,
        lastContactedAt: contact.lastContactedAt,
        lastEmailOpenedAt: contact.lastEmailOpenedAt,
        lastEmailRepliedAt: contact.lastEmailRepliedAt,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
      },
      emails: contact.emails.map((e) => ({
        address: e.address,
        type: e.type,
        isVerified: e.isVerified,
        isPrimary: e.isPrimary,
      })),
      company: contact.company,
      emailLogs,
      campaigns: campaignContacts.map((cc) => ({
        campaignName: cc.campaign.name,
        campaignType: cc.campaign.type,
        status: cc.status,
        joinedAt: cc.createdAt,
      })),
      emailLogCount: emailLogs.length,
    }

    // 返回 JSON 文件下载
    const json = JSON.stringify(exportData, null, 2)
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="contact-${id}-export.json"`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
