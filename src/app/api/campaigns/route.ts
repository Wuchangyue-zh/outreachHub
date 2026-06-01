import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { refreshRunningCampaignStatuses } from '@/lib/campaign-completion'
import { syncCampaignStatsByIds } from '@/lib/campaign-stats-sync'
import { linkAttachmentsToCampaign } from '@/lib/campaign-attachments'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

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
        include: {
          product: { select: { id: true, name: true } },
          _count: { select: { campaignContacts: true } },
        },
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
        include: {
          product: { select: { id: true, name: true } },
          _count: { select: { campaignContacts: true } },
        },
      })
    }

    // #9: 列表页从 EmailLog 同步统计缓存，避免 Campaign 模型字段漂移
    await syncCampaignStatsByIds(campaigns.map((c) => c.id))
    if (campaigns.length > 0) {
      campaigns = await prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true } },
          _count: { select: { campaignContacts: true } },
        },
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
  const rateLimitResult = await limiter.check(req, 10)
  if (rateLimitResult) return rateLimitResult

  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    // #48: 创建 Campaign 需要 campaigns:manage 权限
    if (!hasPermission(auth.role, 'campaigns:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要营销管理权限', 403)
    }

    const body = await req.json()
    const { attachmentIds, ...campaignData } = body

    const campaign = await prisma.campaign.create({
      data: { ...campaignData, tenantId: auth.tenantId },
    })

    if (Array.isArray(attachmentIds) && attachmentIds.length > 0) {
      await linkAttachmentsToCampaign(auth.tenantId, campaign.id, attachmentIds)
    }

    return NextResponse.json({ success: true, data: campaign })
  } catch (error) {
    return handleApiError(error)
  }
}
