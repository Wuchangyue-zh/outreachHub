import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { handleApiError } from '@/lib/api-errors'
import { isValidEmailFormat } from '@/lib/email-guess'
import { sendPlatformMail } from '@/lib/email'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

export async function POST(req: NextRequest) {
  const rateLimitResult = await limiter.check(req, 5)
  if (rateLimitResult) return rateLimitResult

  try {
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const company = typeof body.company === 'string' ? body.company.trim() || null : null
    const phone = typeof body.phone === 'string' ? body.phone.trim() || null : null
    const message = typeof body.message === 'string' ? body.message.trim() || null : null

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: { message: '姓名和邮箱为必填项' } },
        { status: 400 }
      )
    }

    if (!isValidEmailFormat(email)) {
      return NextResponse.json(
        { success: false, error: { message: '邮箱格式不正确' } },
        { status: 400 }
      )
    }

    const demo = await prisma.demoRequest.create({
      data: { name, email, company, phone, message },
    })

    // Send notification email to sales team
    try {
      await sendPlatformMail({
        to: process.env.SMTP_USER || 'sales@outreachhub.com',
        subject: `[OutreachHub] 新演示预约: ${name}`,
        html: `
          <h2>新的演示预约</h2>
          <p><strong>姓名：</strong>${name}</p>
          <p><strong>邮箱：</strong>${email}</p>
          ${company ? `<p><strong>公司：</strong>${company}</p>` : ''}
          ${phone ? `<p><strong>电话：</strong>${phone}</p>` : ''}
          ${message ? `<p><strong>备注：</strong>${message}</p>` : ''}
          <p><strong>时间：</strong>${new Date().toLocaleString('zh-CN')}</p>
        `,
      })
    } catch (emailError) {
      console.error('[Demo] Failed to send notification email:', emailError)
    }

    return NextResponse.json({ success: true, data: demo })
  } catch (error) {
    return handleApiError(error)
  }
}
