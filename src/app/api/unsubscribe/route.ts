import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Lang = 'zh' | 'en' | 'de' | 'fr' | 'es' | 'ja' | 'ko' | 'pt' | 'ru' | 'ar' | 'it' | 'nl'

const ALL_LANG_CODES: readonly string[] = [
  'zh', 'en', 'de', 'fr', 'es', 'ja', 'ko', 'pt', 'ru', 'ar', 'it', 'nl',
]

function isLang(code: string): code is Lang {
  return ALL_LANG_CODES.includes(code)
}

/**
 * J4: 语言检测 — Accept-Language header 优先，其次 tenant 设置，默认中文
 */
function detectLanguage(acceptLang: string, tenantSettings: Record<string, unknown>): Lang {
  // 1. Tenant setting takes priority
  const setting = (tenantSettings.language || tenantSettings.lang) as string | undefined
  if (setting && isLang(setting)) return setting

  // 2. Accept-Language header
  const lower = acceptLang.toLowerCase()
  for (const code of ALL_LANG_CODES) {
    if (lower.startsWith(code)) return code as Lang
  }

  // 3. Default
  return 'zh'
}

/** J4+Q1d: 多语言文案 — 12 languages */
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
  de: {
    successTitle: 'Erfolgreich abbestellt',
    successDesc: 'Sie wurden erfolgreich von unserem E-Mail-Newsletter abgemeldet. Wir werden Ihnen keine Marketing-E-Mails mehr senden. Wenn Sie es sich anders überlegen, wenden Sie sich bitte an den Absender.',
    errorTitle: 'Abbestellung fehlgeschlagen',
    errorDesc: 'Bei der Verarbeitung Ihrer Abbestellungsanfrage ist ein Problem aufgetreten. Bitte wenden Sie sich direkt an den Absender.',
    infoTitle: 'Bereits abbestellt',
    infoDesc: 'Ihr Abbestellungsstatus wurde bereits erfasst.',
    invalidLink: 'Ungültiger Abbestellungslink',
    notFound: 'Kontakt nicht gefunden',
    alreadyUnsub: 'Sie haben bereits abbestellt',
    processError: 'Bei der Verarbeitung Ihrer Anfrage ist ein Fehler aufgetreten',
    footer: 'Verarbeitet durch E-Mail-Marketing-System',
    footerContact: 'Bei Fragen wenden Sie sich bitte an den Absender',
    pageTitle: 'Abbestellen',
  },
  fr: {
    successTitle: 'Désabonnement réussi',
    successDesc: 'Vous avez été désabonné avec succès de notre newsletter. Nous ne vous enverrons plus d\'e-mails marketing. Si vous changez d\'avis, veuillez contacter l\'expéditeur.',
    errorTitle: 'Échec du désabonnement',
    errorDesc: 'Un problème est survenu lors du traitement de votre demande de désabonnement. Veuillez contacter l\'expéditeur directement.',
    infoTitle: 'Déjà désabonné',
    infoDesc: 'Votre statut de désabonnement a déjà été enregistré.',
    invalidLink: 'Lien de désabonnement invalide',
    notFound: 'Contact non trouvé',
    alreadyUnsub: 'Vous êtes déjà désabonné',
    processError: 'Une erreur est survenue lors du traitement de votre demande',
    footer: 'Traité par le système de marketing par e-mail',
    footerContact: 'Si vous avez des questions, veuillez contacter l\'expéditeur',
    pageTitle: 'Se désabonner',
  },
  es: {
    successTitle: 'Suscripción cancelada',
    successDesc: 'Ha cancelado exitosamente su suscripción a nuestro boletín. Ya no le enviaremos correos de marketing. Si cambia de opinión, contacte al remitente.',
    errorTitle: 'Error al cancelar',
    errorDesc: 'Hubo un problema al procesar su solicitud de cancelación. Por favor, contacte al remitente directamente.',
    infoTitle: 'Ya cancelado',
    infoDesc: 'Su estado de cancelación ya ha sido registrado.',
    invalidLink: 'Enlace de cancelación no válido',
    notFound: 'Contacto no encontrado',
    alreadyUnsub: 'Ya ha cancelado su suscripción',
    processError: 'Ocurrió un error al procesar su solicitud',
    footer: 'Procesado por el sistema de marketing por correo electrónico',
    footerContact: 'Si tiene preguntas, por favor contacte al remitente',
    pageTitle: 'Cancelar suscripción',
  },
  ja: {
    successTitle: '配信停止完了',
    successDesc: 'メールマガジンの配信を停止しました。今後マーケティングメールは送信されません。気が変わった場合は、送信者に連絡して再登録してください。',
    errorTitle: '配信停止に失敗しました',
    errorDesc: '配信停止リクエストの処理中に問題が発生しました。送信者に直接お問い合わせください。',
    infoTitle: 'すでに配信停止済み',
    infoDesc: '配信停止の状態はすでに記録されています。',
    invalidLink: '無効な配信停止リンク',
    notFound: '連絡先が見つかりません',
    alreadyUnsub: 'すでに配信停止済みです',
    processError: 'リクエストの処理中にエラーが発生しました',
    footer: 'メールマーケティングシステムによる処理',
    footerContact: 'ご質問がある場合は、送信者にお問い合わせください',
    pageTitle: '配信停止',
  },
  ko: {
    successTitle: '구독 취소 완료',
    successDesc: '이메일 뉴스레터 구독이 취소되었습니다. 앞으로 마케팅 이메일을 보내지 않습니다. 마음이 변경되면 발신자에게 연락하여 재구독해 주세요.',
    errorTitle: '구독 취소 실패',
    errorDesc: '구독 취소 요청 처리 중 문제가 발생했습니다. 발신자에게 직접 문의해 주세요.',
    infoTitle: '이미 구독 취소됨',
    infoDesc: '구독 취소 상태가 이미 기록되어 있습니다.',
    invalidLink: '유효하지 않은 구독 취소 링크',
    notFound: '연락처를 찾을 수 없습니다',
    alreadyUnsub: '이미 구독을 취소하셨습니다',
    processError: '요청 처리 중 오류가 발생했습니다',
    footer: '이메일 마케팅 시스템에 의해 처리됨',
    footerContact: '질문이 있으시면 발신자에게 문의해 주세요',
    pageTitle: '구독 취소',
  },
  pt: {
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
  ru: {
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
  ar: {
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
  it: {
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
  nl: {
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
    const lang: Lang = detectLanguage(acceptLang, {})
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
    const lang: Lang = detectLanguage(acceptLang, {})
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
