import { NextRequest, NextResponse } from 'next/server'

/**
 * 校验 Cron / Webhook 密钥。未配置 CRON_SECRET 时本地开发放行。
 * @returns 401 响应，或 null 表示通过
 */
export function verifyCronSecret(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return null

  const authHeader = req.headers.get('authorization')
  const urlSecret = req.nextUrl.searchParams.get('secret')

  if (authHeader !== `Bearer ${cronSecret}` && urlSecret !== cronSecret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/** 退信 webhook：优先 BOUNCE_WEBHOOK_SECRET，否则复用 CRON_SECRET */
export function verifyBounceWebhook(req: NextRequest): NextResponse | null {
  const secret = process.env.BOUNCE_WEBHOOK_SECRET || process.env.CRON_SECRET
  if (!secret) return null

  const authHeader = req.headers.get('authorization')
  const headerSecret = req.headers.get('x-bounce-secret')
  const urlSecret = req.nextUrl.searchParams.get('secret')

  if (
    authHeader !== `Bearer ${secret}` &&
    headerSecret !== secret &&
    urlSecret !== secret
  ) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
