import { NextRequest, NextResponse } from 'next/server'
import { initializeIMAPClient } from '@/lib/imap'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const client = await initializeIMAPClient()

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'IMAP未配置，请检查环境变量 IMAP_HOST, IMAP_USER, IMAP_PASSWORD',
      }, { status: 400 })
    }

    const replyCount = await client.detectReplies()

    return NextResponse.json({
      success: true,
      replyCount,
      message: `检测到 ${replyCount} 封新回复`,
    })
  } catch (error: any) {
    console.error('IMAP check replies error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '检查回复失败',
    }, { status: 500 })
  }
}
