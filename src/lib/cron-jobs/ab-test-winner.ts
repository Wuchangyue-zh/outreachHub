import { prisma } from '@/lib/prisma'

export async function executeAbTestWinner() {
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
    return { processed: 0, results: [] }
  }

  const results: Array<{ campaignId: string; winner: string; openRateA: number; openRateB: number }> = []

  for (const campaign of campaigns) {
    const assignments = (campaign.abTestAssignments as Record<string, 'A' | 'B'> | null) || {}
    if (Object.keys(assignments).length === 0) continue

    const logs = await prisma.emailLog.findMany({
      where: {
        campaignId: campaign.id,
        status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'] },
      },
      select: { contactId: true, status: true },
    })

    let sentA = 0, openedA = 0, sentB = 0, openedB = 0
    for (const log of logs) {
      if (!log.contactId) continue
      const variant = assignments[log.contactId]
      if (!variant) continue
      const isOpened = ['OPENED', 'CLICKED', 'REPLIED'].includes(log.status)
      if (variant === 'A') { sentA++; if (isOpened) openedA++ }
      else { sentB++; if (isOpened) openedB++ }
    }

    const openRateA = sentA > 0 ? (openedA / sentA) * 100 : 0
    const openRateB = sentB > 0 ? (openedB / sentB) * 100 : 0
    const winner = openRateA >= openRateB ? 'A' : 'B'

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { abTestWinner: winner, status: 'COMPLETED', completedAt: new Date() },
    })

    results.push({ campaignId: campaign.id, winner, openRateA, openRateB })
  }

  return { processed: results.length, results }
}
