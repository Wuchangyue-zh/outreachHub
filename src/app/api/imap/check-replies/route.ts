import { NextRequest, NextResponse } from 'next/server'
import { checkRepliesFromAllAccounts } from '@/lib/imap-multi'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)

    const result = await checkRepliesFromAllAccounts(auth.userId)

    if (result.totalAccounts === 0) {
      return NextResponse.json({
        success: false,
        error: '未找到配置了 IMAP 的邮箱账户，请在邮箱设置中添加 IMAP 信息',
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      replyCount: result.totalReplies,
      data: result,
      message: `检测到 ${result.totalReplies} 封新回复（${result.successAccounts}/${result.totalAccounts} 个账户成功）`,
    })
  } catch (error: any) {
    console.error('IMAP check replies error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '检查回复失败',
    }, { status: 500 })
  }
}
