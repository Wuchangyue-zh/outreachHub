import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { refreshRunningCampaignStatuses } from '@/lib/campaign-completion'

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''

    const skip = (page - 1) * limit
    const where: any = { tenantId: auth.tenantId }
    if (status) where.status = status
    if (type) where.type = type

    let [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.campaign.count({ where }),
    ])

    // 修正已全部发完但仍显示 RUNNING 的单次/定时活动
    const staleRunningIds = campaigns
      .filter((c) => c.status === 'RUNNING' && c.scheduleType !== 'RECURRING')
      .map((c) => c.id)
    if (staleRunningIds.length > 0) {
      await refreshRunningCampaignStatuses(staleRunningIds)
      campaigns = await prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      })
    }

    return NextResponse.json({
      success: true,
      data: campaigns,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const body = await req.json()
    const campaign = await prisma.campaign.create({
      data: { ...body, tenantId: auth.tenantId },
    })
    return NextResponse.json({ success: true, data: campaign })
  } catch (error) {
    return handleApiError(error)
  }
}
