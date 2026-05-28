import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    const template = await prisma.emailTemplate.findUnique({ where: { id } })

    if (!template) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error('Get template error:', error)
    return NextResponse.json({ error: '获取模板失败' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    const body = await req.json()
    const { name, subject, content, category, language, variables } = body

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: { name, subject, content, category, language, variables: variables || [] },
    })

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error('Update template error:', error)
    return NextResponse.json({ error: '更新模板失败' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    await prisma.emailTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true, message: '模板已删除' })
  } catch (error) {
    console.error('Delete template error:', error)
    return NextResponse.json({ error: '删除模板失败' }, { status: 500 })
  }
}