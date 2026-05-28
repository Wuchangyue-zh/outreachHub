import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache } from '@/lib/redis'
import { handleApiError } from '@/lib/api-errors'

export async function GET(req: NextRequest) {
  try {
    const stats = await withCache(
      'stats:dashboard',
      async () => {
        const [totalContacts, totalCompanies, totalCampaigns, emailStats, recentCampaigns] = await Promise.all([
          prisma.contact.count(),
          prisma.company.count(),
          prisma.campaign.count(),
          prisma.emailLog.groupBy({
            by: ['status'],
            _count: true,
          }),
          prisma.campaign.findMany({
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
