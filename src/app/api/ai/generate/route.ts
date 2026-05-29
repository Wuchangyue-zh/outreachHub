import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { generateEmail, generateEmailSubject, generateReplyDraft } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const body = await req.json()
    const { type, data } = body

    if (type === 'generate-email') {
      const result = await generateEmail({
        contactName: data.contactName,
        contactTitle: data.contactTitle,
        companyName: data.companyName,
        companyIndustry: data.companyIndustry,
        productDescription: data.productDescription,
        tone: data.tone || 'professional',
        language: data.language || 'en',
        purpose: data.purpose || 'cold-outreach',
      })
      return NextResponse.json({ success: true, data: result })
    }

    if (type === 'generate-subject') {
      const subjects = await generateEmailSubject({
        contactName: data.contactName,
        companyName: data.companyName,
        productDescription: data.productDescription,
        purpose: data.purpose,
        language: data.language || 'en',
      })
      return NextResponse.json({ success: true, data: subjects })
    }

    if (type === 'generate-reply') {
      const draft = await generateReplyDraft({
        contactName: data.contactName,
        company: data.company || '',
        lastMessage: data.lastMessage,
      })
      return NextResponse.json({ success: true, data: draft })
    }

    return errorResponse(ErrorCodes.VALIDATION_ERROR, '无效的生成类型', 400)
  } catch (error) {
    return handleApiError(error)
  }
}
