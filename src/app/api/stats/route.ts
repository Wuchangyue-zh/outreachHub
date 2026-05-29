import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache } from '@/lib/redis'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const stats = await withCache(
      `stats:dashboard:${auth.tenantId || 'none'}`,
      async () => {
        const tenantFilter = auth.tenantId ? { tenantId: auth.tenantId } : {}

        const [totalContacts, totalCompanies, totalCampaigns, emailStats, recentCampaigns] = await Promise.all([
          prisma.contact.count({ where: tenantFilter }),
          prisma.company.count({ where: tenantFilter }),
          prisma.campaign.count({ where: tenantFilter }),
          prisma.emailLog.groupBy({
            by: ['status'],
            _count: true,
          }),
          prisma.campaign.findMany({
            where: tenantFilter,
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              name: true,
              status: true,
              totalSent: true,
              totalOpened: true,
              totalReplied: true,
              createdAt: true,
            },
          }),
        ])

        const stats: Record<string, any> = {
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
          stats[`emails_${s.status}`] = s._count
        }

        // Calculate rates
        const totalSent = stats.emails_SENT || 0
        const totalOpened = stats.emails_OPENED || 0
        const totalReplied = stats.emails_REPLIED || 0

        stats.openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0
        stats.replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0

        return stats
      },
      { ttl: 60 } // Cache for 60 seconds
    )

    return NextResponse.json({ success: true, data: stats })
  } catch (error) {
    return handleApiError(error)
  }
}
