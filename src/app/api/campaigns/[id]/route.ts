import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    const campaign = await prisma.campaign.findUnique({ where: { id } })

    if (!campaign) {
      return NextResponse.json({ error: '活动不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: campaign })
  } catch (error) {
    console.error('Get campaign error:', error)
    return NextResponse.json({ error: '获取活动详情失败' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    const body = await req.json()
    const { name, subject, content, type, scheduleType, scheduledAt } = body

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name,
        subject,
        content,
        type: type || 'SINGLE',
        scheduleType: scheduleType || 'IMMEDIATE',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    })

    return NextResponse.json({ success: true, data: campaign })
  } catch (error) {
    console.error('Update campaign error:', error)
    return NextResponse.json({ error: '更新活动失败' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params
    await prisma.emailLog.deleteMany({ where: { campaignId: id } })
    await prisma.campaign.delete({ where: { id } })
    return NextResponse.json({ success: true, message: '活动已删除' })
  } catch (error) {
    console.error('Delete campaign error:', error)
    return NextResponse.json({ error: '删除活动失败' }, { status: 500 })
  }
}