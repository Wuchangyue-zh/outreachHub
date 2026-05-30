import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Lang = 'zh' | 'en'

/**
 * J4: 语言检测 — Accept-Language header 优先，其次 tenant 设置，默认中文
 */
function detectLanguage(acceptLang: string, tenantSettings: Record<string, unknown>): Lang {
  const setting = (tenantSettings.language || tenantSettings.lang) as string | undefined
  if (setting === 'en') return 'en'
  if (setting === 'zh') return 'zh'
  if (acceptLang.toLowerCase().startsWith('en')) return 'en'
  return 'zh'
}

/** J4: 多语言文案 */
const i18n: Record<Lang, Record<string, string>> = {
  zh: {
    successTitle: '退订成功',
    successDesc: '您已成功退订。我们将不再向您发送营销邮件。如果您改变主意，可以联系发件人重新订阅。',
    errorTitle: '退订失败',
    errorDesc: '处理您的退订请求时出现问题。请联系发件人直接退订。',
    infoTitle: '已退订',
    infoDesc: '您的退订状态已经记录在系统中。',
    invalidLink: '无效的退订链接',
    notFound: '未找到该联系人',
    alreadyUnsub: '您已经退订过了',
    processError: '处理退订请求时出错',
    footer: '此操作由邮件营销系统处理',
    footerContact: '如有疑问，请联系发件人',
    pageTitle: '退订',
  },
  en: {
    successTitle: 'Unsubscribed',
    successDesc: 'You have been successfully unsubscribed. We will no longer send you marketing emails. If you change your mind, please contact the sender to resubscribe.',
    errorTitle: 'Unsubscribe Failed',
    errorDesc: 'There was a problem processing your unsubscribe request. Please contact the sender directly.',
    infoTitle: 'Already Unsubscribed',
    infoDesc: 'Your unsubscribe status has already been recorded.',
    invalidLink: 'Invalid unsubscribe link',
    notFound: 'Contact not found',
    alreadyUnsub: 'You have already unsubscribed',
    processError: 'An error occurred while processing your request',
    footer: 'Processed by email marketing system',
    footerContact: 'If you have questions, please contact the sender',
    pageTitle: 'Unsubscribe',
  },
}

/**
 * GET /api/unsubscribe?cid=xxx&lid=xxx
 *
 * 退订链接处理：
 * 1. 验证参数
 * 2. 标记联系人为已退订
 * 3. 更新 Campaign 统计
 * 4. 返回品牌化退订成功页面（多语言）
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const contactId = searchParams.get('cid')
    const logId = searchParams.get('lid')
    const campaignId = searchParams.get('camp')

    // 预检测语言（无 contact 时用 Accept-Language）
    const acceptLang = req.headers.get('accept-language') || ''
    const lang: Lang = acceptLang.toLowerCase().startsWith('en') ? 'en' : 'zh'
    const t = i18n[lang]

    if (!contactId) {
      return new NextResponse(
        generateUnsubscribePage('error', t.invalidLink, t, lang, null),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    // 查找联系人（含租户信息用于品牌化）
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { tenant: { select: { id: true, name: true, settings: true } } },
    })

    if (!contact) {
      return new NextResponse(
        generateUnsubscribePage('error', t.notFound, t, lang, null),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    // J4: 使用 tenant 设置的语言
    const tenantSettings = (contact.tenant?.settings as Record<string, unknown>) || {}
    const finalLang = detectLanguage(acceptLang, tenantSettings)
    const ft = i18n[finalLang]

    // 检查是否已退订
    if (contact.unsubscribed) {
      return new NextResponse(
        generateUnsubscribePage('info', ft.alreadyUnsub, ft, finalLang, contact.tenant),
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
        data: { totalUnsubscribed: { increment: 1 } },
      }).catch(() => {})
    }

    // 记录到 EmailLog（如果提供了 logId）
    if (logId) {
      await prisma.emailLog.update({
        where: { id: logId },
        data: { status: 'UNSUBSCRIBED' },
      }).catch(() => {})
    }

    console.log(`[Unsubscribe] Contact ${contactId} unsubscribed from campaign ${campaignId || 'unknown'}`)

    return new NextResponse(
      generateUnsubscribePage('success', ft.successTitle, ft, finalLang, contact.tenant),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (error: any) {
    console.error('[Unsubscribe] Error:', error)
    const acceptLang = req.headers.get('accept-language') || ''
    const lang: Lang = acceptLang.toLowerCase().startsWith('en') ? 'en' : 'zh'
    return new NextResponse(
      generateUnsubscribePage('error', i18n[lang].processError, i18n[lang], lang, null),
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
        data: { totalUnsubscribed: { increment: 1 } },
      }).catch(() => {})
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

// ==================== J4: 品牌化退订页面 ====================

type TenantInfo = {
  id: string
  name: string
  settings: unknown
} | null

function generateUnsubscribePage(
  type: 'success' | 'error' | 'info',
  title: string,
  t: Record<string, string>,
  lang: Lang,
  tenant: TenantInfo,
): string {
  const colors = {
    success: { bg: '#f0fdf4', border: '#86efac', text: '#166534', icon: '✓' },
    error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icon: '✕' },
    info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', icon: 'ℹ' },
  }

  const color = colors[type]
  const brandName = tenant?.name || 'OutreachHub'
  const descKey = type === 'success' ? 'successDesc' : type === 'error' ? 'errorDesc' : 'infoDesc'
  const description = t[descKey] || ''

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.pageTitle} - ${brandName}</title>
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
    .brand {
      font-size: 14px;
      color: #9ca3af;
      margin-bottom: 24px;
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
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">${brandName}</div>
    <div class="icon">${color.icon}</div>
    <h1>${title}</h1>
    <p>${description}</p>
    <div class="footer">
      <p>${t.footer}</p>
      <p>${t.footerContact}</p>
    </div>
  </div>
</body>
</html>`
}
