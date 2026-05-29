import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { generateCampaignEmail } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)

    const body = await req.json()
    const { productPrompt, tone } = body

    if (!productPrompt?.trim()) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '请输入产品描述', 400)
    }

    const email = await generateCampaignEmail(productPrompt.trim(), tone || 'professional')

    if (!email) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'AI 未返回有效内容', 500)
    }

    return NextResponse.json({
      success: true,
      data: { email },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
