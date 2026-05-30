import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { sendAccountMail } from '@/lib/email-account-mail'

async function resolveContactId(
  tenantId: string,
  to: string,
  contactId?: string
): Promise<string | null> {
  if (contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId },
      select: { id: true },
    })
    if (contact) return contact.id
  }

  const contactEmail = await prisma.contactEmail.findFirst({
    where: {
      address: { equals: to, mode: 'insensitive' },
      contact: { tenantId },
    },
    select: { contactId: true },
  })

  return contactEmail?.contactId ?? null
}

// POST /api/inbox/reply — send a reply email
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const body = await req.json()
    const { to, subject, content, emailAccountId, emailLogIds, contactId } = body

    if (!to || !content) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '缺少必要字段: to, content', 400)
    }

    if (!emailAccountId) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '请选择发件账户', 400)
    }

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

    const resolvedContactId = await resolveContactId(auth.tenantId, to, contactId)
    if (!resolvedContactId) {
      return errorResponse(ErrorCodes.NOT_FOUND, '未找到对应的联系人，无法记录往来', 404)
    }

    const { checkDailyLimit } = await import('@/lib/email-account-mail')
    const canSend = await checkDailyLimit(emailAccountId)
    if (!canSend) {
      return errorResponse(ErrorCodes.RATE_LIMIT_EXCEEDED, '今日发送已达上限', 429)
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; white-space: pre-wrap;">
        ${content.replace(/\n/g, '<br>')}
      </div>
    `

    const result = await sendAccountMail({
      emailAccountId,
      to,
      subject: subject || 'Re: 回复',
      text: content,
      html: htmlContent,
    })

    if (emailLogIds && emailLogIds.length > 0) {
      await prisma.emailLog.updateMany({
        where: { id: { in: emailLogIds } },
        data: { tracked: true },
      })
    }

    const emailLog = await prisma.emailLog.create({
      data: {
        contactId: resolvedContactId,
        fromEmail: account.email,
        toEmail: to,
        subject: subject || 'Re: 回复',
        content,
        htmlContent,
        status: 'SENT',
        sentAt: new Date(),
        messageId: result.messageId,
      },
    })

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      emailLogId: emailLog.id,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
