import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateEmail, generateEmailSubject } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
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

    return NextResponse.json({ error: '无效的生成类型' }, { status: 400 })
  } catch (error) {
    console.error('AI generation error:', error)
    return NextResponse.json({ error: 'AI生成失败，请稍后重试' }, { status: 500 })
  }
}
