import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''

    const skip = (page - 1) * limit
    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.campaign.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: campaigns,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return NextResponse.json({ error: '获取活动列表失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const campaign = await prisma.campaign.create({ data: body })
    return NextResponse.json({ success: true, data: campaign })
  } catch (error) {
    return NextResponse.json({ error: '创建活动失败' }, { status: 500 })
  }
}
