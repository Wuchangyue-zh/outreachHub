import { NextRequest, NextResponse } from 'next/server'
import { addEmailTracking } from '@/lib/email-tracking'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes } from '@/lib/api-errors'
import { sendAccountMail } from '@/lib/email-account-mail'
import { sendPlatformMail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const body = await req.json()
    const { to, subject, content, contactId, plain, emailAccountId } = body

    if (!to) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '请提供收件人邮箱', 400)
    }

    const htmlContent = plain
      ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; white-space: pre-wrap;">${(content || '').replace(/\n/g, '<br>')}</div>`
      : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
        <h2 style="margin: 0;">OutreachHub 邮件发送测试</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
        <p>${content || '这是一封来自 OutreachHub 平台的测试邮件，验证SMTP配置是否正常工作。'}</p>
        <p style="color: #6b7280; font-size: 12px;">此邮件由 OutreachHub 系统自动发送</p>
      </div>
    </div>`

    // Create email log entry for tracking
    let emailLogId = 'test-' + Date.now()
    let senderEmail = process.env.SMTP_USER || ''

    if (contactId) {
      const emailLog = await prisma.emailLog.create({
        data: {
          contactId,
          fromEmail: senderEmail,
          toEmail: to,
          subject: subject || 'OutreachHub 测试邮件',
          content: content || '',
          htmlContent,
          status: 'PENDING',
        },
      })
      emailLogId = emailLog.id
    }

    // Add tracking if contactId provided
    const trackedHtml = contactId
      ? addEmailTracking(htmlContent, emailLogId, contactId)
      : htmlContent

    let result: { success: boolean; messageId?: string }

    // 根据是否指定 EmailAccount 选择发送方式
    if (emailAccountId) {
      // P1-5 修复：验证 EmailAccount 所有权
      const account = await prisma.emailAccount.findFirst({
        where: {
          id: emailAccountId,
          userId: auth.userId,
          isActive: true,
        },
        select: { id: true, email: true },
      })

      if (!account) {
        return errorResponse(ErrorCodes.NOT_FOUND, '账户不存在或无权使用', 404)
      }

      // 使用用户 EmailAccount 发送
      result = await sendAccountMail({
        emailAccountId,
        to,
        subject: subject || 'OutreachHub 测试邮件',
        text: content || '这是一封测试邮件，验证SMTP配置是否正常。',
        html: trackedHtml,
      })

      senderEmail = account.email
    } else {
      // 使用平台 SMTP 发送（通过 sendPlatformMail 统一入口）
      const mailResult = await sendPlatformMail({
        to,
        subject: subject || 'OutreachHub 测试邮件',
        text: content || '这是一封测试邮件，验证SMTP配置是否正常。',
        html: trackedHtml,
      })

      result = { success: true, messageId: mailResult.messageId }
    }

    // Update email log status if created
    if (contactId) {
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          messageId: result.messageId,
        },
      })
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      emailLogId: contactId ? emailLogId : undefined,
      trackingEnabled: !!contactId,
      usedAccount: !!emailAccountId,
    })
  } catch (error: any) {
    console.error('Email send error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '邮件发送失败',
      code: error.code,
    }, { status: 500 })
  }
}
