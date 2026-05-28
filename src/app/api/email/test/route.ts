import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { to, subject, content } = body

    if (!to) {
      return NextResponse.json({ error: '请提供收件人邮箱' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.jafron.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'wuchangyue@jafron.com',
        pass: process.env.SMTP_PASSWORD || '',
      },
      connectionTimeout: 10000,
    })

    const result = await transporter.sendMail({
      from: `"OutreachHub" <${process.env.SMTP_USER || 'wuchangyue@jafron.com'}>`,
      to,
      subject: subject || 'OutreachHub 测试邮件',
      text: content || '这是一封测试邮件，验证SMTP配置是否正常。',
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
          <h2 style="margin: 0;">OutreachHub 邮件发送测试</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p>${content || '这是一封来自 OutreachHub 平台的测试邮件，验证SMTP配置是否正常工作。'}</p>
          <p style="color: #6b7280; font-size: 12px;">此邮件由 OutreachHub 系统自动发送</p>
        </div>
      </div>`,
    })

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      response: result.response,
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