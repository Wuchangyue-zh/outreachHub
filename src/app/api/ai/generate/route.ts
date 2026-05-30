import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import {
  generateEmail, generateEmailSubject, generateReplyDraft,
  polishEmail, translateEmail
} from '@/lib/openai'

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

    // #50: AI 润色/改写邮件
    if (type === 'polish-email') {
      if (!data.content) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, '请提供邮件内容', 400)
      }
      const polished = await polishEmail(data.content, data.tone || 'professional')
      return NextResponse.json({ success: true, data: { content: polished } })
    }

    // #50: AI 翻译邮件
    if (type === 'translate-email') {
      if (!data.content || !data.targetLanguage) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, '请提供邮件内容和目标语言', 400)
      }
      const translated = await translateEmail(data.content, data.targetLanguage)
      return NextResponse.json({ success: true, data: { content: translated } })
    }

    return errorResponse(ErrorCodes.VALIDATION_ERROR, '无效的生成类型', 400)
  } catch (error) {
    return handleApiError(error)
  }
}
