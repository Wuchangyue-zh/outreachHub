import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache } from '@/lib/redis'
import { verifyAuthToken, tenantWhere } from '@/lib/auth-middleware'
import { getTenantStatsSnapshot, refreshTenantStatsCache } from '@/lib/stats-aggregate'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    if (!auth.tenantId) {
      return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    }

    const cached = await getTenantStatsSnapshot(auth.tenantId)
    if (cached && Date.now() - cached.updatedAt < 30000) {
      return NextResponse.json({
        success: true,
        data: {
          totalContacts: cached.totalContacts,
          totalCompanies: cached.totalCompanies,
          totalCampaigns: cached.totalCampaigns,
          emails_SENT: cached.emailsSent,
          emails_OPENED: cached.emailsOpened,
          emails_REPLIED: cached.emailsReplied,
          openRate: cached.emailsSent > 0 ? (cached.emailsOpened / cached.emailsSent) * 100 : 0,
          replyRate: cached.emailsSent > 0 ? (cached.emailsReplied / cached.emailsSent) * 100 : 0,
          recentCampaigns: [],
          fromCache: true,
        },
      })
    }

    const stats = await withCache(
      `stats:dashboard:${auth.tenantId}`,
      async () => {
        const tenantFilter = tenantWhere(auth.tenantId)

        // #4: recentCampaigns 从 EmailLog 聚合，避免 stale totalSent
        const [totalContacts, totalCompanies, totalCampaigns, emailStats, recentCampaignsRaw] = await Promise.all([
          prisma.contact.count({ where: tenantFilter }),
          prisma.company.count({ where: tenantFilter }),
          prisma.campaign.count({ where: tenantFilter }),
          prisma.emailLog.groupBy({
            by: ['status'],
            where: auth.tenantId ? { campaign: { tenantId: auth.tenantId } } : undefined,
            _count: true,
          }),
          prisma.campaign.findMany({
            where: tenantFilter,
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, name: true, status: true, createdAt: true },
          }),
        ])

        // 从 EmailLog 聚合每个 recentCampaign 的统计
        const campaignIds = recentCampaignsRaw.map((c) => c.id)
        const logAgg = campaignIds.length > 0
          ? await prisma.emailLog.groupBy({
              by: ['campaignId', 'status'],
              where: { campaignId: { in: campaignIds } },
              _count: true,
            })
          : []

        const statsMap = new Map<string, { totalSent: number; totalOpened: number; totalReplied: number }>()
        for (const row of logAgg) {
          if (!row.campaignId) continue
          const entry = statsMap.get(row.campaignId) || { totalSent: 0, totalOpened: 0, totalReplied: 0 }
          if (['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'].includes(row.status)) {
            entry.totalSent += row._count
          }
          if (['OPENED', 'CLICKED', 'REPLIED'].includes(row.status)) {
            entry.totalOpened += row._count
          }
          if (row.status === 'REPLIED') {
            entry.totalReplied += row._count
          }
          statsMap.set(row.campaignId, entry)
        }

        const recentCampaigns = recentCampaignsRaw.map((c) => {
          const s = statsMap.get(c.id) || { totalSent: 0, totalOpened: 0, totalReplied: 0 }
          return { ...c, ...s }
        })

        const result: Record<string, any> = {
          totalContacts,
          totalCompanies,
          totalCampaigns,
          recentCampaigns,
          emails_SENT: 0,
          emails_OPENED: 0,
          emails_REPLIED: 0,
        }

        // Aggregate email stats
        for (const s of emailStats) {
          result[`emails_${s.status}`] = s._count
        }

        // Calculate rates
        const totalSent = result.emails_SENT || 0
        const totalOpened = result.emails_OPENED || 0
        const totalReplied = result.emails_REPLIED || 0

        result.openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0
        result.replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0

        return result
      },
      { ttl: 60 }
    )

    if (auth.tenantId) {
      await refreshTenantStatsCache(auth.tenantId)
    }

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    return handleApiError(error)
  }
}
