import { NextRequest, NextResponse } from 'next/server'
import { verifyEmail, verifyBatchEmails } from '@/lib/email-verify'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { emails, customerIds } = body

    if (emails && Array.isArray(emails)) {
      const results = await verifyBatchEmails(emails)
      const validEmails = results.filter((r) => r.status === 'valid')
      const invalidEmails = results.filter((r) => r.status === 'invalid')

      return NextResponse.json({
        success: true,
        data: {
          total: results.length,
          valid: validEmails.length,
          invalid: invalidEmails.length,
          details: results,
        },
      })
    }

    return NextResponse.json({ error: '请提供邮箱列表' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: '邮箱验证失败' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: '请提供邮箱地址' }, { status: 400 })
    }

    const result = await verifyEmail(email)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json({ error: '邮箱验证失败' }, { status: 500 })
  }
}
