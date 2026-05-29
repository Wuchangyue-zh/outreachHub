import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { sendAccountMail } from '@/lib/email-account-mail'

// POST /api/inbox/reply — send a reply email
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)

    const body = await req.json()
    const { to, subject, content, emailAccountId, emailLogIds } = body

    if (!to || !content) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '缺少必要字段: to, content', 400)
    }

    if (!emailAccountId) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '请选择发件账户', 400)
    }

    // 验证账户属于当前用户
    const account = await prisma.emailAccount.findFirst({
      where: {
        id: emailAccountId,
        userId: auth.userId,
        isActive: true,
      },
    })

    if (!account) {
      return errorResponse(ErrorCodes.NOT_FOUND, '账户不存在或无权使用', 404)
    }

    // 检查发送限额
    const { checkDailyLimit } = await import('@/lib/email-account-mail')
    const canSend = await checkDailyLimit(emailAccountId)
    if (!canSend) {
      return errorResponse(ErrorCodes.RATE_LIMITED, '今日发送已达上限', 429)
    }

    // 构建 HTML 内容
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; white-space: pre-wrap;">
        ${content.replace(/\n/g, '<br>')}
      </div>
    `

    // 发送邮件
    const result = await sendAccountMail({
      emailAccountId,
      to,
      subject: subject || 'Re: 回复',
      text: content,
      html: htmlContent,
    })

    // 记录回复日志
    if (emailLogIds && emailLogIds.length > 0) {
      // 更新原始邮件的回复状态
      await prisma.emailLog.updateMany({
        where: {
          id: { in: emailLogIds },
        },
        data: {
          tracked: true, // 标记为已处理
        },
      })
    }

    // 创建新的邮件日志记录回复
    await prisma.emailLog.create({
      data: {
        fromEmail: account.email,
        toEmail: to,
        subject: subject || 'Re: 回复',
        content,
        htmlContent,
        status: 'SENT',
        sentAt: new Date(),
        messageId: result.messageId,
        userId: auth.userId,
      },
    })

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
