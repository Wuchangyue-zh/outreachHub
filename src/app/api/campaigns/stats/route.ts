import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache } from '@/lib/redis'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes } from '@/lib/api-errors'
import {
  aggregateCampaignStatsFromLogs,
  syncCampaignStatsFromLogs,
} from '@/lib/campaign-stats-sync'
import { localizeGeoStats } from '@/lib/geo'

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuthToken(req)
    if (!authResult.success) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, authResult.error || 'Unauthorized', 401)
    }

    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')

    const cacheKey = campaignId
      ? `campaign:stats:${campaignId}`
      : 'campaigns:stats:all'

    const stats = await withCache(
      cacheKey,
      async () => {
        const where: any = { tenantId: authResult.tenantId }
        if (campaignId) where.id = campaignId

        // Fetch campaigns with email logs
        const campaigns = await prisma.campaign.findMany({
          where,
          include: {
            emailLogs: {
              select: {
                status: true,
                sentAt: true,
                openedAt: true,
                clickedAt: true,
                repliedAt: true,
              },
            },
          },
        })

        // #9: 同步每个 Campaign 的聚合统计到模型字段
        for (const campaign of campaigns) {
          if (campaign.emailLogs.length > 0) {
            await syncCampaignStatsFromLogs(campaign.id, campaign.emailLogs)
          }
        }

        // Calculate overall stats
        let totalSent = 0
        let totalOpened = 0
        let totalClicked = 0
        let totalReplied = 0
        let totalBounced = 0

        const dailyStatsMap = new Map<string, {
          date: string
          sent: number
          opened: number
          clicked: number
          replied: number
        }>()

        campaigns.forEach((campaign) => {
          campaign.emailLogs.forEach((log) => {
            if (['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'].includes(log.status)) {
              totalSent++

              const sentDate = log.sentAt?.toISOString().split('T')[0]
              if (sentDate) {
                if (!dailyStatsMap.has(sentDate)) {
                  dailyStatsMap.set(sentDate, {
                    date: sentDate,
                    sent: 0,
                    opened: 0,
                    clicked: 0,
                    replied: 0,
                  })
                }
                dailyStatsMap.get(sentDate)!.sent++
              }
            }

            if (log.status === 'OPENED' || log.status === 'CLICKED' || log.status === 'REPLIED') {
              totalOpened++

              const openedDate = log.openedAt?.toISOString().split('T')[0]
              if (openedDate && dailyStatsMap.has(openedDate)) {
                dailyStatsMap.get(openedDate)!.opened++
              }
            }

            if (log.status === 'CLICKED' || log.status === 'REPLIED') {
              totalClicked++

              const clickedDate = log.clickedAt?.toISOString().split('T')[0]
              if (clickedDate && dailyStatsMap.has(clickedDate)) {
                dailyStatsMap.get(clickedDate)!.clicked++
              }
            }

            if (log.status === 'REPLIED') {
              totalReplied++

              const repliedDate = log.repliedAt?.toISOString().split('T')[0]
              if (repliedDate && dailyStatsMap.has(repliedDate)) {
                dailyStatsMap.get(repliedDate)!.replied++
              }
            }

            if (log.status === 'BOUNCED') {
              totalBounced++
            }
          })
        })

        // Convert daily stats map to array and sort by date
        const dailyStats = Array.from(dailyStatsMap.values())
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-30) // Last 30 days

        // Calculate rates
        const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0
        const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0
        const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0
        const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0

        // Campaign comparison (if not filtering by specific campaign)
        let comparison: any[] = []
        if (!campaignId) {
          const campaignStats = campaigns.map((campaign) => {
            const agg = aggregateCampaignStatsFromLogs(campaign.emailLogs)
            return {
              name: campaign.name,
              openRate: agg.totalSent > 0 ? (agg.totalOpened / agg.totalSent) * 100 : 0,
              clickRate: agg.totalSent > 0 ? (agg.totalClicked / agg.totalSent) * 100 : 0,
              replyRate: agg.totalSent > 0 ? (agg.totalReplied / agg.totalSent) * 100 : 0,
            }
          })

          // Sort by open rate and take top 10
          comparison = campaignStats
            .sort((a, b) => b.openRate - a.openRate)
            .slice(0, 10)
        }

        // K2: 地理分析 — 按国家聚合打开数
        const geoWhere: any = { tenantId: authResult.tenantId, openCountry: { not: null } }
        if (campaignId) geoWhere.campaignId = campaignId
        const geoStats = await prisma.emailLog.groupBy({
          by: ['openCountry'],
          where: geoWhere,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 20,
        })

        const geo = localizeGeoStats(
          geoStats
            .filter((g) => g.openCountry)
            .map((g) => ({ country: g.openCountry, count: g._count.id })),
          'zh'
        )

        // Q2b: 城市 Top 10 — 按 openCity 聚合打开数
        const cityWhere: any = { tenantId: authResult.tenantId, openCity: { not: null } }
        if (campaignId) cityWhere.campaignId = campaignId
        const cityStats = await prisma.emailLog.groupBy({
          by: ['openCity'],
          where: cityWhere,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        })

        const cities = cityStats
          .filter((s) => s.openCity && s.openCity !== '')
          .map((s) => ({ city: s.openCity, count: s._count.id }))

        return {
          overall: {
            totalSent,
            totalOpened,
            totalClicked,
            totalReplied,
            totalBounced,
            openRate,
            clickRate,
            replyRate,
            bounceRate,
          },
          daily: dailyStats,
          comparison,
          geo,
          cities,
        }
      },
      { ttl: 300 } // Cache for 5 minutes
    )

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error: any) {
    console.error('Campaign stats error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error.message || 'Failed to fetch campaign statistics',
      500
    )
  }
}
