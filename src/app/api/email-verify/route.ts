import { NextRequest, NextResponse } from 'next/server'
import { verifyEmail, verifyBatchEmails } from '@/lib/email-verify'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

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

    return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '请提供邮箱列表', 400)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '请提供邮箱地址', 400)
    }

    const result = await verifyEmail(email)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return handleApiError(error)
  }
}
