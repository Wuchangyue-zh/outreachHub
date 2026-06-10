import { NextRequest, NextResponse } from 'next/server'
import { isProductionEnv } from './env'

/**
 * 校验 Cron / Webhook 密钥。生产环境必须配置 CRON_SECRET。
 * @returns 401/503 响应，或 null 表示通过
 */
export function verifyCronSecret(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    if (isProductionEnv()) {
      return NextResponse.json(
        { success: false, error: 'CRON_SECRET not configured' },
        { status: 503 }
      )
    }
    return null
  }

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

  if (!secret) {
    if (isProductionEnv()) {
      return NextResponse.json(
        { success: false, error: 'BOUNCE_WEBHOOK_SECRET or CRON_SECRET required' },
        { status: 503 }
      )
    }
    return null
  }

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
