import { NextRequest, NextResponse } from 'next/server'
import { initializeIMAPClient } from '@/lib/imap'
import { getCategoryLabel } from '@/lib/reply-classifier'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes } from '@/lib/api-errors'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const client = await initializeIMAPClient()

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'IMAP未配置，请检查环境变量 IMAP_HOST, IMAP_USER, IMAP_PASSWORD',
      }, { status: 400 })
    }

    const { replyCount, classifications } = await client.detectReplies()

    const summary = classifications.reduce((acc, { category }) => {
      const label = getCategoryLabel(category as any)
      acc[label] = (acc[label] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      replyCount,
      classifications: classifications.map(c => ({
        ...c,
        categoryLabel: getCategoryLabel(c.category as any),
      })),
      summary,
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
