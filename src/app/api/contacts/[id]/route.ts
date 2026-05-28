import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: { emails: true, company: true },
    })

    if (!contact) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: contact })
  } catch (error) {
    console.error('Get contact error:', error)
    return NextResponse.json({ error: '获取客户详情失败' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    const body = await req.json()
    const { firstName, lastName, title, department, emails, country, city, tags, notes, status } = body

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        firstName,
        lastName,
        fullName: `${firstName || ''} ${lastName || ''}`.trim(),
        title,
        department,
        country,
        city,
        tags: tags || [],
        notes,
        status,
      },
      include: { emails: true },
    })

    if (emails && emails.length > 0) {
      await prisma.contactEmail.deleteMany({ where: { contactId: id } })
      await prisma.contactEmail.createMany({
        data: emails.map((email: string, i: number) => ({
          contactId: id,
          address: email,
          isPrimary: i === 0,
        })),
      })
    }

    return NextResponse.json({ success: true, data: contact })
  } catch (error) {
    console.error('Update contact error:', error)
    return NextResponse.json({ error: '更新客户失败' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    await prisma.contactEmail.deleteMany({ where: { contactId: id } })
    await prisma.contact.delete({ where: { id } })
    return NextResponse.json({ success: true, message: '客户已删除' })
  } catch (error) {
    console.error('Delete contact error:', error)
    return NextResponse.json({ error: '删除客户失败' }, { status: 500 })
  }
}