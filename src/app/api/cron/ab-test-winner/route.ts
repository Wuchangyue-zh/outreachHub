import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyCronSecret } from '@/lib/cron-auth'

/**
 * GET/POST /api/cron/ab-test-winner
 *
 * #8: A/B 测试胜出版本判定（sentAt 超过 48h 后按 openRate 选 winner）
 */
export async function GET(req: NextRequest) {
  return handleAbTestWinner(req)
}

export async function POST(req: NextRequest) {
  return handleAbTestWinner(req)
}

async function handleAbTestWinner(_req: NextRequest) {
  try {
    const unauthorized = verifyCronSecret(_req)
    if (unauthorized) return unauthorized

    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)

    const campaigns = await prisma.campaign.findMany({
      where: {
        abTestEnabled: true,
        type: 'AB_TEST',
        status: 'RUNNING',
        sentAt: { lte: cutoff },
      },
    })

    if (campaigns.length === 0) {
      return NextResponse.json({ success: true, data: { processed: 0 } })
    }

    const results: Array<{ campaignId: string; winner: string; openRateA: number; openRateB: number }> = []

    for (const campaign of campaigns) {
      const assignments = (campaign.abTestAssignments as Record<string, 'A' | 'B'> | null) || {}
      const assignmentKeys = Object.keys(assignments)
      if (assignmentKeys.length === 0) continue

      const logs = await prisma.emailLog.findMany({
        where: {
          campaignId: campaign.id,
          status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'] },
        },
        select: { contactId: true, status: true },
      })

      let sentA = 0
      let openedA = 0
      let sentB = 0
      let openedB = 0

      for (const log of logs) {
        if (!log.contactId) continue
        const variant = assignments[log.contactId]
        if (!variant) continue
        const isOpened = ['OPENED', 'CLICKED', 'REPLIED'].includes(log.status)
        if (variant === 'A') {
          sentA++
          if (isOpened) openedA++
        } else {
          sentB++
          if (isOpened) openedB++
        }
      }

      const openRateA = sentA > 0 ? (openedA / sentA) * 100 : 0
      const openRateB = sentB > 0 ? (openedB / sentB) * 100 : 0
      const winner = openRateA >= openRateB ? 'A' : 'B'

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          abTestWinner: winner,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })

      results.push({ campaignId: campaign.id, winner, openRateA, openRateB })
    }

    return NextResponse.json({ success: true, data: { processed: results.length, results } })
  } catch (error) {
    console.error('[ab-test-winner] Error:', error)
    return NextResponse.json({ success: false, error: 'A/B 判定失败' }, { status: 500 })
  }
}
