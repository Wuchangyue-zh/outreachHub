import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendPlatformMail } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

function getAppBaseUrl() {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3030'
}

export async function POST(req: NextRequest) {
  const rateLimitResult = await limiter.check(req, 5)
  if (rateLimitResult) return rateLimitResult

  try {
    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '请输入邮箱地址', 400)
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // 无论用户是否存在，都返回相同提示，防止邮箱枚举
    const genericResponse = NextResponse.json({
      success: true,
      message: '如果该邮箱已注册，您将收到一封包含重置链接的邮件',
    })

    if (!user) {
      return genericResponse
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 小时

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    })

    const resetUrl = `${getAppBaseUrl()}/reset-password?token=${resetToken}`

    sendPlatformMail({
      to: email,
      subject: '重置您的 OutreachHub 密码',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1f2937;">重置密码</h2>
          <p style="color: #6b7280; line-height: 1.6;">
            您好${user.name ? ` ${user.name}` : ''}，我们收到了您的密码重置请求。请点击下方按钮设置新密码（链接 1 小时内有效）：
          </p>
          <p style="margin: 24px 0;">
            <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              重置密码
            </a>
          </p>
          <p style="color: #9ca3af; font-size: 12px; word-break: break-all;">
            若按钮无法点击，请复制此链接到浏览器：<br/>${resetUrl}
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
            如非您本人操作，请忽略此邮件，您的密码不会被更改。
          </p>
        </div>
      `,
      text: `重置密码：${resetUrl}\n链接 1 小时内有效。如非您本人操作请忽略。`,
    }).catch((err) => console.error('Failed to send password reset email:', err))

    return genericResponse
  } catch (error) {
    return handleApiError(error)
  }
}
