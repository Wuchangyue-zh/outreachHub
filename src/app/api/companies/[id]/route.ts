import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    const company = await prisma.company.findUnique({
      where: { id },
      include: { contacts: true },
    })

    if (!company) {
      return NextResponse.json({ error: '公司不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: company })
  } catch (error) {
    console.error('Get company error:', error)
    return NextResponse.json({ error: '获取公司详情失败' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    const body = await req.json()
    const { name, domain, website, industry, size, country, countryCode, city, linkedinUrl, description } = body

    const company = await prisma.company.update({
      where: { id },
      data: { name, domain, website, industry, size, country, countryCode, city, linkedinUrl, description },
    })

    return NextResponse.json({ success: true, data: company })
  } catch (error) {
    console.error('Update company error:', error)
    return NextResponse.json({ error: '更新公司失败' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    const contactsCount = await prisma.contact.count({ where: { companyId: id } })

    if (contactsCount > 0) {
      return NextResponse.json(
        { error: `该公司有 ${contactsCount} 个关联客户，请先删除或转移客户` },
        { status: 400 }
      )
    }

    await prisma.company.delete({ where: { id } })
    return NextResponse.json({ success: true, message: '公司已删除' })
  } catch (error) {
    console.error('Delete company error:', error)
    return NextResponse.json({ error: '删除公司失败' }, { status: 500 })
  }
}