import { NextRequest, NextResponse } from 'next/server'
import { checkRepliesFromAllAccounts } from '@/lib/imap-multi'
import { verifyCronSecret } from '@/lib/cron-auth'

/**
 * GET/POST /api/cron/check-replies
 *
 * 定时任务：检查所有 IMAP 账户的回复邮件
 *
 * 触发方式：
 * 1. Vercel Cron: 在 vercel.json 中配置
 * 2. 外部 Cron 服务：如 cron-job.org、EasyCron 等
 * 3. 手动调用：curl -X POST http://localhost:3030/api/cron/check-replies
 *
 * 环境变量：
 * - CRON_SECRET: 可选，用于验证请求来源的密钥
 */
export async function GET(req: NextRequest) {
  return handleCronRequest(req)
}

export async function POST(req: NextRequest) {
  return handleCronRequest(req)
}

async function handleCronRequest(req: NextRequest) {
  try {
    const unauthorized = verifyCronSecret(req)
    if (unauthorized) return unauthorized

    console.log('[Cron] Starting check-replies job...')

    const result = await checkRepliesFromAllAccounts()

    console.log(`[Cron] check-replies completed: ${result.totalReplies} replies found across ${result.successAccounts} accounts`)

    return NextResponse.json({
      success: true,
      message: `Checked ${result.totalAccounts} accounts, found ${result.totalReplies} replies`,
      data: result,
    })
  } catch (error: any) {
    console.error('[Cron] check-replies failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}
