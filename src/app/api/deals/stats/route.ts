import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

export async function GET(req: NextRequest) {
  const rateLimitResult = await limiter.check(req, 30)
  if (rateLimitResult) return rateLimitResult

  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)

    const tenantFilter = { tenantId: auth.tenantId }

    // Group by stage: count and sum of amount
    const stageStats = await prisma.deal.groupBy({
      by: ['stage'],
      where: tenantFilter,
      _count: { id: true },
      _sum: { amount: true },
    })

    // Build stage maps for easy lookup
    const stageCountMap: Record<string, number> = {}
    const stageAmountMap: Record<string, number> = {}
    for (const row of stageStats) {
      stageCountMap[row.stage] = row._count.id
      stageAmountMap[row.stage] = row._sum.amount || 0
    }

    const stages = ['LEAD', 'OPPORTUNITY', 'QUOTE', 'WON', 'LOST']
    const byStage: Record<string, { count: number; totalAmount: number }> = {}
    for (const s of stages) {
      byStage[s] = {
        count: stageCountMap[s] || 0,
        totalAmount: stageAmountMap[s] || 0,
      }
    }

    // Totals
    const totalDeals = stages.reduce((sum, s) => sum + (stageCountMap[s] || 0), 0)
    const wonDeals = stageCountMap['WON'] || 0
    const wonAmount = stageAmountMap['WON'] || 0

    // Conversion rates: pipeline stages in order
    // LEAD→OPPORTUNITY: deals at or past OPPORTUNITY / all deals
    // OPPORTUNITY→QUOTE: deals at or past QUOTE / deals at or past OPPORTUNITY
    // QUOTE→WON: WON / deals at or past QUOTE
    const pastLead = (stageCountMap['OPPORTUNITY'] || 0) + (stageCountMap['QUOTE'] || 0) + wonDeals + (stageCountMap['LOST'] || 0)
    const pastOpportunity = (stageCountMap['QUOTE'] || 0) + wonDeals + (stageCountMap['LOST'] || 0)
    const pastQuote = wonDeals + (stageCountMap['LOST'] || 0)

    const conversionRate = {
      leadToOpportunity: totalDeals > 0 ? Math.round((pastLead / totalDeals) * 10000) / 100 : 0,
      opportunityToQuote: pastLead > 0 ? Math.round((pastOpportunity / pastLead) * 10000) / 100 : 0,
      quoteToWon: pastQuote > 0 ? Math.round((wonDeals / pastQuote) * 10000) / 100 : 0,
    }

    // Average deal cycle (days from createdAt to closedAt for WON deals)
    const wonDealsWithDates = await prisma.deal.findMany({
      where: { ...tenantFilter, stage: 'WON', closedAt: { not: null } },
      select: { createdAt: true, closedAt: true },
    })

    let avgDealCycle = 0
    if (wonDealsWithDates.length > 0) {
      const totalDays = wonDealsWithDates.reduce((sum, deal) => {
        const days = Math.ceil(
          (deal.closedAt!.getTime() - deal.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        )
        return sum + days
      }, 0)
      avgDealCycle = Math.round((totalDays / wonDealsWithDates.length) * 10) / 10
    }

    return NextResponse.json({
      success: true,
      data: {
        byStage,
        totalDeals,
        wonDeals,
        wonAmount,
        totalAmount: stages.reduce((sum, s) => sum + (stageAmountMap[s] || 0), 0),
        conversionRate,
        avgDealCycle,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
