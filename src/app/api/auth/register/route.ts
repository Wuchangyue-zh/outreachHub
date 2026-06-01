import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { generateToken } from '@/lib/jwt'
import { rateLimit } from '@/lib/rate-limit'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { sendPlatformMail } from '@/lib/email'
import { syncTenantLimits } from '@/lib/plan-limits'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

export async function POST(req: NextRequest) {
  // Rate limiting: 3 requests per minute
  const rateLimitResult = await limiter.check(req, 3)
  if (rateLimitResult) return rateLimitResult

  try {
    const body = await req.json()
    const { email, password, name, company, consentAt } = body

    if (!email || !password) {
      return errorResponse(
        ErrorCodes.MISSING_REQUIRED_FIELD,
        '邮箱和密码为必填项',
        400
      )
    }

    if (!consentAt) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        '请同意服务条款和隐私政策',
        400
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return errorResponse(
        ErrorCodes.ALREADY_EXISTS,
        '该邮箱已注册',
        409
      )
    }

    const passwordHash = await hashPassword(password)

    // Create tenant for the new user
    const trialStartedAt = new Date()
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 天试用期

    const tenantSettings = { consentAt, consentVersion: '2026-05-31' }

    const tenant = await prisma.tenant.create({
      data: {
        name: company || `${name || email}的企业`,
        plan: 'FREE',
        maxUsers: 1,
        maxContacts: 1000,
        maxEmailsPerDay: 100,
        trialStartedAt,
        trialEndsAt,
        settings: tenantSettings,
      },
    })

    await syncTenantLimits(tenant.id, tenant.plan)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash,
        role: 'ADMIN',
        tenantId: tenant.id,
      },
    })

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: user.role,
    })

    // P1-4: 发送欢迎邮件（异步，不阻塞响应）
    sendPlatformMail({
      to: email,
      subject: '🎉 欢迎加入 OutreachHub！',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 30px; border-radius: 12px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">欢迎加入 OutreachHub！</h1>
            <p style="margin: 10px 0 0; opacity: 90;">智能拓客与邮件营销平台</p>
          </div>

          <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #374151;">Hi ${name || email.split('@')[0]}，</p>

            <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
              感谢您注册 OutreachHub！我们致力于帮助出海企业高效拓客，通过智能邮件营销提升业务转化。
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px; color: #1f2937;">🚀 快速开始</h3>
              <ul style="margin: 0; padding: 0; list-style: none;">
                <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">
                  ✅ 配置您的邮件账户（SMTP）
                </li>
                <li style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">
                  ✅ 导入目标联系人
                </li>
                <li style="padding: 8px 0; color: #6b7280;">
                  ✅ 创建并启动邮件活动
                </li>
              </ul>
            </div>

            <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
              如有任何问题，欢迎随时联系我们的支持团队。
            </p>

            <p style="font-size: 14px; color: #374151; margin-top: 30px;">
              祝商祺！<br/>
              <strong>OutreachHub 团队</strong>
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p>此邮件由系统自动发送，请勿直接回复</p>
          </div>
        </div>
      `,
      text: `Hi ${name || email.split('@')[0]}，欢迎加入 OutreachHub！感谢您注册我们的智能拓客与邮件营销平台。`,
    }).catch(err => console.error('Failed to send welcome email:', err))

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    return handleApiError(error)
  }
}
