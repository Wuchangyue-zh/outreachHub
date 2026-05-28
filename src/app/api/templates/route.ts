import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || ''
    const language = searchParams.get('language') || 'en'

    const where: any = { isActive: true, language }
    if (category) where.category = category

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: { usageCount: 'desc' },
    })

    return NextResponse.json({ success: true, data: templates })
  } catch (error) {
    return NextResponse.json({ error: '获取模板失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const template = await prisma.emailTemplate.create({ data: body })
    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    return NextResponse.json({ error: '创建模板失败' }, { status: 500 })
  }
}
