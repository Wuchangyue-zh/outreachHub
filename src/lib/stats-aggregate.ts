import { getRedis } from './redis'

const STATS_PREFIX = 'stats:tenant:'

export interface TenantStatsSnapshot {
  totalContacts: number
  totalCompanies: number
  totalCampaigns: number
  emailsSent: number
  emailsOpened: number
  emailsReplied: number
  updatedAt: number
}

function statsKey(tenantId: string): string {
  return `${STATS_PREFIX}${tenantId}`
}

export async function incrementTenantStat(
  tenantId: string,
  field: keyof Omit<TenantStatsSnapshot, 'updatedAt'>,
  amount = 1
): Promise<void> {
  const client = getRedis()
  if (!client) return

  const key = statsKey(tenantId)
  try {
    await client.hincrby(key, field, amount)
    await client.hset(key, 'updatedAt', Date.now().toString())
    await client.expire(key, 86400)
  } catch (err) {
    console.error('[StatsAggregate] increment failed:', err)
  }
}

export async function getTenantStatsSnapshot(
  tenantId: string
): Promise<TenantStatsSnapshot | null> {
  const client = getRedis()
  if (!client) return null

  try {
    const data = await client.hgetall(statsKey(tenantId))
    if (!data || Object.keys(data).length === 0) return null

    return {
      totalContacts: parseInt(data.totalContacts || '0', 10),
      totalCompanies: parseInt(data.totalCompanies || '0', 10),
      totalCampaigns: parseInt(data.totalCampaigns || '0', 10),
      emailsSent: parseInt(data.emailsSent || '0', 10),
      emailsOpened: parseInt(data.emailsOpened || '0', 10),
      emailsReplied: parseInt(data.emailsReplied || '0', 10),
      updatedAt: parseInt(data.updatedAt || '0', 10),
    }
  } catch {
    return null
  }
}

export async function refreshTenantStatsCache(tenantId: string): Promise<TenantStatsSnapshot> {
  const { prisma } = await import('./prisma')
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [totalContacts, totalCompanies, totalCampaigns, emailStats] = await Promise.all([
    prisma.contact.count({ where: { tenantId } }),
    prisma.company.count({ where: { tenantId } }),
    prisma.campaign.count({ where: { tenantId } }),
    prisma.emailLog.groupBy({
      by: ['status'],
      where: { campaign: { tenantId } },
      _count: true,
    }),
  ])

  let emailsSent = 0
  let emailsOpened = 0
  let emailsReplied = 0
  for (const row of emailStats) {
    if (['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'].includes(row.status)) {
      emailsSent += row._count
    }
    if (['OPENED', 'CLICKED', 'REPLIED'].includes(row.status)) {
      emailsOpened += row._count
    }
    if (row.status === 'REPLIED') {
      emailsReplied += row._count
    }
  }

  const snapshot: TenantStatsSnapshot = {
    totalContacts,
    totalCompanies,
    totalCampaigns,
    emailsSent,
    emailsOpened,
    emailsReplied,
    updatedAt: Date.now(),
  }

  const client = getRedis()
  if (client) {
    await client.hset(statsKey(tenantId), {
      totalContacts: String(totalContacts),
      totalCompanies: String(totalCompanies),
      totalCampaigns: String(totalCampaigns),
      emailsSent: String(emailsSent),
      emailsOpened: String(emailsOpened),
      emailsReplied: String(emailsReplied),
      updatedAt: String(snapshot.updatedAt),
    })
    await client.expire(statsKey(tenantId), 86400)
  }

  return snapshot
}
