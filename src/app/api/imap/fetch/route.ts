import { NextRequest, NextResponse } from 'next/server'
import { initializeIMAPClient } from '@/lib/imap'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')
    const daysAgo = parseInt(req.nextUrl.searchParams.get('days') || '7')

    const client = await initializeIMAPClient()

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'IMAP未配置',
      }, { status: 400 })
    }

    const since = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    const emails = await client.fetchInboxEmails(since, limit)

    return NextResponse.json({
      success: true,
      data: emails,
      count: emails.length,
    })
  } catch (error: any) {
    console.error('IMAP fetch error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '获取邮件失败',
    }, { status: 500 })
  }
}
