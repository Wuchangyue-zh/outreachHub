import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/unsubscribe?cid=xxx&lid=xxx
 *
 * 退订链接处理：
 * 1. 验证参数
 * 2. 标记联系人为已退订
 * 3. 更新 Campaign 统计
 * 4. 返回退订成功页面
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const contactId = searchParams.get('cid')
    const logId = searchParams.get('lid')
    const campaignId = searchParams.get('camp')

    if (!contactId) {
      return new NextResponse(
        generateUnsubscribePage('error', '无效的退订链接'),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    // 查找联系人
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    })

    if (!contact) {
      return new NextResponse(
        generateUnsubscribePage('error', '未找到该联系人'),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    // 检查是否已退订
    if (contact.unsubscribed) {
      return new NextResponse(
        generateUnsubscribePage('info', '您已经退订过了'),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    // 标记退订
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        unsubscribed: true,
        unsubscribedAt: new Date(),
        unsubscribeReason: 'link-click',
        status: 'NOT_INTERESTED',
      },
    })

    // 更新 Campaign 统计（如果提供了 campaignId）
    if (campaignId) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalUnsubscribed: { increment: 1 },
        },
      })
    }

    // 记录到 EmailLog（如果提供了 logId）
    if (logId) {
      await prisma.emailLog.update({
        where: { id: logId },
        data: {
          status: 'UNSUBSCRIBED',
        },
      })
    }

    console.log(`[Unsubscribe] Contact ${contactId} unsubscribed from campaign ${campaignId || 'unknown'}`)

    return new NextResponse(
      generateUnsubscribePage('success', '退订成功'),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (error: any) {
    console.error('[Unsubscribe] Error:', error)
    return new NextResponse(
      generateUnsubscribePage('error', '处理退订请求时出错'),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }
}

/**
 * POST /api/unsubscribe
 *
 * 通过 API 退订（用于批量退订或管理后台）
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { contactId, campaignId, reason } = body

    if (!contactId) {
      return NextResponse.json(
        { success: false, error: 'contactId is required' },
        { status: 400 }
      )
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    })

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      )
    }

    if (contact.unsubscribed) {
      return NextResponse.json({
        success: true,
        message: 'Contact already unsubscribed',
      })
    }

    await prisma.contact.update({
      where: { id: contactId },
      data: {
        unsubscribed: true,
        unsubscribedAt: new Date(),
        unsubscribeReason: reason || 'manual',
        status: 'NOT_INTERESTED',
      },
    })

    if (campaignId) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalUnsubscribed: { increment: 1 },
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Contact unsubscribed successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

function generateUnsubscribePage(type: 'success' | 'error' | 'info', message: string): string {
  const colors = {
    success: { bg: '#f0fdf4', border: '#86efac', text: '#166534', icon: '✓' },
    error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icon: '✕' },
    info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', icon: 'ℹ' },
  }

  const color = colors[type]

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>退订 - OutreachHub</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f9fafb;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      padding: 48px;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${color.bg};
      border: 2px solid ${color.border};
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 32px;
      color: ${color.text};
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 12px;
    }
    p {
      font-size: 16px;
      color: #6b7280;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .footer {
      font-size: 14px;
      color: #9ca3af;
      border-top: 1px solid #e5e7eb;
      padding-top: 24px;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${color.icon}</div>
    <h1>${message}</h1>
    <p>${getUnsubscribeDescription(type)}</p>
    <div class="footer">
      <p>此操作由 OutreachHub 邮件营销系统处理</p>
      <p>如有疑问，请联系发件人</p>
    </div>
  </div>
</body>
</html>`
}

function getUnsubscribeDescription(type: 'success' | 'error' | 'info'): string {
  switch (type) {
    case 'success':
      return '您已成功退订。我们将不再向您发送营销邮件。如果您改变主意，可以联系发件人重新订阅。'
    case 'error':
      return '处理您的退订请求时出现问题。请联系发件人直接退订。'
    case 'info':
      return '您的退订状态已经记录在系统中。'
  }
}
