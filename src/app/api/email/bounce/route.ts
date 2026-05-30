import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { markAsBounced } from '@/lib/bounce-handler'
import { verifyBounceWebhook } from '@/lib/cron-auth'

/**
 * POST /api/email/bounce
 *
 * #14: 接收退信通知 webhook（SMTP 退信回调）
 *
 * 鉴权：配置 BOUNCE_WEBHOOK_SECRET 或 CRON_SECRET 后需 Header
 * `Authorization: Bearer <secret>` 或 `x-bounce-secret: <secret>`
 */
export async function POST(req: NextRequest) {
  try {
    const unauthorized = verifyBounceWebhook(req)
    if (unauthorized) return unauthorized

    const body = await req.json()
    const { emailLogId, messageId, toEmail, campaignId, reason, emailAccountId } = body

    let logId: string | null = null

    if (emailLogId) {
      logId = emailLogId
    } else if (messageId) {
      const log = await prisma.emailLog.findFirst({
        where: { messageId },
        select: { id: true },
      })
      logId = log?.id || null
    } else if (toEmail) {
      const where: any = {
        toEmail,
        status: { in: ['SENT', 'DELIVERED'] },
      }
      if (campaignId) where.campaignId = campaignId

      const log = await prisma.emailLog.findFirst({
        where,
        orderBy: { sentAt: 'desc' },
        select: { id: true },
      })
      logId = log?.id || null
    }

    if (!logId) {
      return NextResponse.json(
        { success: false, error: '未找到匹配的邮件记录' },
        { status: 404 }
      )
    }

    const bounced = await markAsBounced(logId, reason, emailAccountId)

    return NextResponse.json({
      success: true,
      data: { emailLogId: logId, bounced },
    })
  } catch (error) {
    console.error('[bounce webhook] Error:', error)
    return NextResponse.json(
      { success: false, error: '退信处理失败' },
      { status: 500 }
    )
  }
}
