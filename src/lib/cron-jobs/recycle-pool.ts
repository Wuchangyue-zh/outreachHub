/**
 * Cron: 公海客户自动回收
 *
 * 将私海中超期未跟进的联系人回收到公海。
 * 规则见 docs/claude-next-development.md P2-1。
 */
import { prisma } from '../prisma'
import { writeAuditLog } from '../audit'
import { getPoolReleaseDays } from '../env'

const BATCH_SIZE = 100

export interface RecyclePoolResult {
  scanned: number
  released: number
  skipped: number
  errors: number
  durationMs: number
}

export async function executeRecyclePool(): Promise<RecyclePoolResult> {
  const started = Date.now()
  const cutoffDays = getPoolReleaseDays()
  const cutoff = new Date(Date.now() - cutoffDays * 86_400_000)

  let scanned = 0
  let released = 0
  let skipped = 0
  let errors = 0

  // Process in batches with cursor pagination
  let cursor: string | undefined

  while (true) {
    const candidates = await prisma.contact.findMany({
      where: {
        pool: 'PRIVATE',
        ownerId: { not: null },
        claimedAt: { lt: cutoff },
        status: { not: 'CONVERTED' },
        // All activity fields null or older than cutoff
        OR: [
          { lastActivityAt: null },
          { lastActivityAt: { lt: cutoff } },
        ],
        AND: [
          {
            OR: [
              { lastContactedAt: null },
              { lastContactedAt: { lt: cutoff } },
            ],
          },
          {
            OR: [
              { lastEmailRepliedAt: null },
              { lastEmailRepliedAt: { lt: cutoff } },
            ],
          },
        ],
      },
      select: {
        id: true,
        tenantId: true,
        ownerId: true,
        claimedAt: true,
        lastActivityAt: true,
        lastContactedAt: true,
        lastEmailRepliedAt: true,
      },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    if (candidates.length === 0) break

    for (const contact of candidates) {
      scanned++
      cursor = contact.id

      try {
        // Exclude contacts with active tasks (PENDING/RUNNING)
        const activeTasks = await prisma.task.count({
          where: {
            contactId: contact.id,
            tenantId: contact.tenantId,
            status: { in: ['PENDING', 'RUNNING'] },
          },
        })
        if (activeTasks > 0) {
          skipped++
          continue
        }

        // Exclude contacts with active deals (not WON/LOST)
        const activeDeals = await prisma.deal.count({
          where: {
            contactId: contact.id,
            tenantId: contact.tenantId,
            stage: { notIn: ['WON', 'LOST'] },
          },
        })
        if (activeDeals > 0) {
          skipped++
          continue
        }

        // Exclude contacts with recent email logs after cutoff
        const recentEmails = await prisma.emailLog.count({
          where: {
            contactId: contact.id,
            createdAt: { gt: cutoff },
          },
        })
        if (recentEmails > 0) {
          skipped++
          continue
        }

        // Exclude contacts with recent tasks after cutoff
        const recentTasks = await prisma.task.count({
          where: {
            contactId: contact.id,
            tenantId: contact.tenantId,
            createdAt: { gt: cutoff },
          },
        })
        if (recentTasks > 0) {
          skipped++
          continue
        }

        // Exclude contacts with recent deals after cutoff
        const recentDeals = await prisma.deal.count({
          where: {
            contactId: contact.id,
            tenantId: contact.tenantId,
            createdAt: { gt: cutoff },
          },
        })
        if (recentDeals > 0) {
          skipped++
          continue
        }

        // Revalidate every eligibility condition in the conditional update.
        // This prevents manual transfers or newly recorded activity from being overwritten.
        const oldOwnerId = contact.ownerId!
        const lastRelevantAt = [
          contact.claimedAt,
          contact.lastActivityAt,
          contact.lastContactedAt,
          contact.lastEmailRepliedAt,
        ].reduce<Date | null>((latest, value) => {
          if (!value) return latest
          return !latest || value > latest ? value : latest
        }, null)
        const inactiveDays = lastRelevantAt
          ? Math.floor((Date.now() - lastRelevantAt.getTime()) / 86_400_000)
          : cutoffDays

        const updateResult = await prisma.contact.updateMany({
          where: {
            id: contact.id,
            tenantId: contact.tenantId,
            ownerId: oldOwnerId,
            pool: 'PRIVATE',
            claimedAt: { lt: cutoff },
            status: { not: 'CONVERTED' },
            OR: [
              { lastActivityAt: null },
              { lastActivityAt: { lt: cutoff } },
            ],
            AND: [
              {
                OR: [
                  { lastContactedAt: null },
                  { lastContactedAt: { lt: cutoff } },
                ],
              },
              {
                OR: [
                  { lastEmailRepliedAt: null },
                  { lastEmailRepliedAt: { lt: cutoff } },
                ],
              },
            ],
            tasks: {
              none: {
                OR: [
                  { status: { in: ['PENDING', 'RUNNING'] } },
                  { createdAt: { gt: cutoff } },
                ],
              },
            },
            deals: {
              none: {
                OR: [
                  { stage: { notIn: ['WON', 'LOST'] } },
                  { createdAt: { gt: cutoff } },
                ],
              },
            },
            emailLogs: {
              none: { createdAt: { gt: cutoff } },
            },
          },
          data: {
            ownerId: null,
            pool: 'PUBLIC',
            claimedAt: null,
            // Preserve lastActivityAt and history
          },
        })

        if (updateResult.count === 0) {
          // Race condition: contact was already transferred
          skipped++
          continue
        }

        // Audit log (no PII)
        await writeAuditLog({
          userId: 'system',
          tenantId: contact.tenantId ?? undefined,
          action: 'auto_release_contact',
          resource: 'contact',
          resourceId: contact.id,
          meta: {
            originalOwnerId: oldOwnerId,
            inactiveDays,
            reason: `超过 ${cutoffDays} 天未跟进自动回收`,
          },
        })

        released++
      } catch (err) {
        errors++
        console.error(`[recycle-pool] Error processing contact ${contact.id}:`, err)
      }
    }

    // If we got fewer than BATCH_SIZE, we're done
    if (candidates.length < BATCH_SIZE) break
  }

  return {
    scanned,
    released,
    skipped,
    errors,
    durationMs: Date.now() - started,
  }
}
