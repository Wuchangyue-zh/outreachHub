import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/contacts/[id]/timeline
 *
 * 获取联系人的互动时间线
 * 返回：邮件发送、打开、点击、回复等事件
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const { id } = await ctx.params

    // 验证联系人属于当前租户
    const contact = await prisma.contact.findFirst({
      where: {
        id,
        tenantId: auth.tenantId,
      },
      include: {
        company: {
          select: { name: true },
        },
        emails: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    })

    if (!contact) {
      return errorResponse(ErrorCodes.NOT_FOUND, '联系人不存在或无权访问', 404)
    }

    // 获取该联系人的所有邮件日志
    const emailLogs = await prisma.emailLog.findMany({
      where: { contactId: id },
      include: {
        campaign: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 构建时间线事件
    const timeline: Array<{
      id: string
      type: 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed'
      timestamp: string
      campaign?: { id: string; name: string }
      details: {
        subject?: string
        toEmail?: string
        fromEmail?: string
        replyCategory?: string
        bounceReason?: string
        error?: string
      }
    }> = []

    for (const log of emailLogs) {
      // 邮件发送事件
      if (log.status === 'SENT' || log.status === 'DELIVERED') {
        timeline.push({
          id: `sent-${log.id}`,
          type: 'sent',
          timestamp: log.sentAt?.toISOString() || log.createdAt.toISOString(),
          campaign: log.campaign || undefined,
          details: {
            subject: log.subject,
            toEmail: log.toEmail,
            fromEmail: log.fromEmail,
          },
        })
      }

      // 邮件打开事件
      if (log.openedAt) {
        timeline.push({
          id: `opened-${log.id}`,
          type: 'opened',
          timestamp: log.openedAt.toISOString(),
          campaign: log.campaign || undefined,
          details: {
            subject: log.subject,
          },
        })
      }

      // 链接点击事件
      if (log.clickedAt) {
        timeline.push({
          id: `clicked-${log.id}`,
          type: 'clicked',
          timestamp: log.clickedAt.toISOString(),
          campaign: log.campaign || undefined,
          details: {
            subject: log.subject,
          },
        })
      }

      // 回复事件
      if (log.repliedAt) {
        timeline.push({
          id: `replied-${log.id}`,
          type: 'replied',
          timestamp: log.repliedAt.toISOString(),
          campaign: log.campaign || undefined,
          details: {
            subject: log.subject,
            replyCategory: log.replyCategory || undefined,
          },
        })
      }

      // 退信事件
      if (log.bouncedAt) {
        timeline.push({
          id: `bounced-${log.id}`,
          type: 'bounced',
          timestamp: log.bouncedAt.toISOString(),
          campaign: log.campaign || undefined,
          details: {
            subject: log.subject,
            bounceReason: log.bounceReason || undefined,
          },
        })
      }

      // 发送失败事件
      if (log.status === 'FAILED') {
        timeline.push({
          id: `failed-${log.id}`,
          type: 'failed',
          timestamp: log.createdAt.toISOString(),
          campaign: log.campaign || undefined,
          details: {
            subject: log.subject,
            error: log.error || undefined,
          },
        })
      }
    }

    // 按时间排序（最新的在前）
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // 计算统计摘要
    const summary = {
      totalEmailsSent: emailLogs.filter(l => ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'].includes(l.status)).length,
      totalOpened: emailLogs.filter(l => l.openedAt).length,
      totalClicked: emailLogs.filter(l => l.clickedAt).length,
      totalReplied: emailLogs.filter(l => l.repliedAt).length,
      totalBounced: emailLogs.filter(l => l.bouncedAt).length,
      totalFailed: emailLogs.filter(l => l.status === 'FAILED').length,
      lastContactedAt: contact.lastContactedAt?.toISOString() || null,
      lastEmailRepliedAt: contact.lastEmailRepliedAt?.toISOString() || null,
    }

    return NextResponse.json({
      success: true,
      data: {
        contact: {
          id: contact.id,
          name: contact.fullName,
          email: contact.emails?.[0]?.address || '',
          company: contact.company?.name || '',
        },
        summary,
        timeline,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
