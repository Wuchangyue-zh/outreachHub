/**
 * 公海自动回收（recycle-pool）单元测试
 */

const mockFindMany = jest.fn()
const mockTaskCount = jest.fn()
const mockDealCount = jest.fn()
const mockEmailLogCount = jest.fn()
const mockUpdateMany = jest.fn()
const mockWriteAuditLog = jest.fn().mockResolvedValue(undefined)

jest.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findMany: (...args: any[]) => mockFindMany(...args),
      updateMany: (...args: any[]) => mockUpdateMany(...args),
    },
    task: { count: (...args: any[]) => mockTaskCount(...args) },
    deal: { count: (...args: any[]) => mockDealCount(...args) },
    emailLog: { count: (...args: any[]) => mockEmailLogCount(...args) },
  },
}))

jest.mock('@/lib/audit', () => ({
  writeAuditLog: (...args: any[]) => mockWriteAuditLog(...args),
}))

function setupMocks(overrides: {
  findMany?: any
  taskCount?: number
  dealCount?: number
  emailLogCount?: number
  updateManyCount?: number
} = {}) {
  mockFindMany.mockReset()
  mockTaskCount.mockReset()
  mockDealCount.mockReset()
  mockEmailLogCount.mockReset()
  mockUpdateMany.mockReset()
  mockWriteAuditLog.mockClear()

  mockTaskCount.mockResolvedValue(overrides.taskCount ?? 0)
  mockDealCount.mockResolvedValue(overrides.dealCount ?? 0)
  mockEmailLogCount.mockResolvedValue(overrides.emailLogCount ?? 0)
  mockUpdateMany.mockResolvedValue({ count: overrides.updateManyCount ?? 1 })

  if (overrides.findMany !== undefined) {
    if (Array.isArray(overrides.findMany) && Array.isArray(overrides.findMany[0])) {
      // Array of batches: apply each as mockResolvedValueOnce
      for (const batch of overrides.findMany) {
        mockFindMany.mockResolvedValueOnce(batch)
      }
    } else {
      mockFindMany.mockResolvedValue(overrides.findMany)
    }
  }
}

describe('recycle-pool', () => {
  beforeEach(() => {
    process.env.POOL_AUTO_RELEASE_DAYS = '30'
  })

  describe('getPoolReleaseDays', () => {
    it('should use default 30 days when env not set', () => {
      delete process.env.POOL_AUTO_RELEASE_DAYS
      const { getPoolReleaseDays } = require('@/lib/env')
      expect(getPoolReleaseDays()).toBe(30)
    })

    it('should respect custom env value', () => {
      process.env.POOL_AUTO_RELEASE_DAYS = '14'
      const { getPoolReleaseDays } = require('@/lib/env')
      expect(getPoolReleaseDays()).toBe(14)
    })

    it('should clamp to minimum 1', () => {
      process.env.POOL_AUTO_RELEASE_DAYS = '0'
      const { getPoolReleaseDays } = require('@/lib/env')
      expect(getPoolReleaseDays()).toBe(1)
    })

    it('should clamp to maximum 365', () => {
      process.env.POOL_AUTO_RELEASE_DAYS = '500'
      const { getPoolReleaseDays } = require('@/lib/env')
      expect(getPoolReleaseDays()).toBe(365)
    })

    it('should default to 30 for non-numeric', () => {
      process.env.POOL_AUTO_RELEASE_DAYS = 'abc'
      const { getPoolReleaseDays } = require('@/lib/env')
      expect(getPoolReleaseDays()).toBe(30)
    })
  })

  describe('cron-auth', () => {
    it('should reject wrong secret', () => {
      const { verifyCronSecret } = require('@/lib/cron-auth')
      const orig = process.env.CRON_SECRET
      process.env.CRON_SECRET = 'correct'
      const mockReq = {
        headers: { get: (k: string) => k === 'authorization' ? 'Bearer wrong' : null },
        nextUrl: { searchParams: { get: () => null } },
      } as any
      const result = verifyCronSecret(mockReq)
      expect(result).not.toBeNull()
      expect(result.status).toBe(401)
      process.env.CRON_SECRET = orig
    })

    it('should accept correct secret', () => {
      const { verifyCronSecret } = require('@/lib/cron-auth')
      const orig = process.env.CRON_SECRET
      process.env.CRON_SECRET = 'correct'
      const mockReq = {
        headers: { get: (k: string) => k === 'authorization' ? 'Bearer correct' : null },
        nextUrl: { searchParams: { get: () => null } },
      } as any
      const result = verifyCronSecret(mockReq)
      expect(result).toBeNull()
      process.env.CRON_SECRET = orig
    })

    it('should allow no secret in dev mode', () => {
      const { verifyCronSecret } = require('@/lib/cron-auth')
      const origSecret = process.env.CRON_SECRET
      delete process.env.CRON_SECRET
      const mockReq = {
        headers: { get: () => null },
        nextUrl: { searchParams: { get: () => null } },
      } as any
      expect(verifyCronSecret(mockReq)).toBeNull()
      process.env.CRON_SECRET = origSecret
    })
  })

  describe('cron-handlers registration', () => {
    it('should not throw Unknown cron job type for recycle-pool', async () => {
      setupMocks({ findMany: [] })
      const { runCronHandler } = require('@/lib/cron-handlers')
      await expect(runCronHandler('recycle-pool')).resolves.toBeDefined()
    })
  })

  describe('executeRecyclePool', () => {
    it('should return empty result when no candidates', async () => {
      setupMocks({ findMany: [] })
      const { executeRecyclePool } = require('@/lib/cron-jobs/recycle-pool')
      const result = await executeRecyclePool()
      expect(result.scanned).toBe(0)
      expect(result.released).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.errors).toBe(0)
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('should release eligible contact', async () => {
      const oldDate = new Date('2020-01-01')
      setupMocks({
        findMany: [
          [{ id: 'c1', tenantId: 't1', ownerId: 'u1', claimedAt: oldDate, lastActivityAt: oldDate }],
          [],
        ],
      })
      const { executeRecyclePool } = require('@/lib/cron-jobs/recycle-pool')
      const result = await executeRecyclePool()
      expect(result.released).toBe(1)
      expect(result.scanned).toBe(1)
      expect(mockUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          id: 'c1',
          tenantId: 't1',
          ownerId: 'u1',
          pool: 'PRIVATE',
          claimedAt: { lt: expect.any(Date) },
          status: { not: 'CONVERTED' },
          tasks: { none: { OR: expect.any(Array) } },
          deals: { none: { OR: expect.any(Array) } },
          emailLogs: { none: { createdAt: { gt: expect.any(Date) } } },
        }),
        data: expect.objectContaining({ ownerId: null, pool: 'PUBLIC', claimedAt: null }),
      }))
      expect(mockWriteAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 't1',
        action: 'auto_release_contact',
        resourceId: 'c1',
      }))
    })

    it('should skip contact with active tasks', async () => {
      const oldDate = new Date('2020-01-01')
      setupMocks({
        findMany: [
          [{ id: 'c2', tenantId: 't1', ownerId: 'u1', claimedAt: oldDate, lastActivityAt: oldDate }],
          [],
        ],
        taskCount: 1,
      })
      const { executeRecyclePool } = require('@/lib/cron-jobs/recycle-pool')
      const result = await executeRecyclePool()
      expect(result.scanned).toBe(1)
      expect(result.skipped).toBe(1)
      expect(result.released).toBe(0)
    })

    it('should skip contact with active deals', async () => {
      const oldDate = new Date('2020-01-01')
      setupMocks({
        findMany: [
          [{ id: 'c3', tenantId: 't1', ownerId: 'u1', claimedAt: oldDate, lastActivityAt: oldDate }],
          [],
        ],
        dealCount: 1,
      })
      const { executeRecyclePool } = require('@/lib/cron-jobs/recycle-pool')
      const result = await executeRecyclePool()
      expect(result.skipped).toBe(1)
      expect(result.released).toBe(0)
    })

    it('should skip contact with recent emails', async () => {
      const oldDate = new Date('2020-01-01')
      setupMocks({
        findMany: [
          [{ id: 'c4', tenantId: 't1', ownerId: 'u1', claimedAt: oldDate, lastActivityAt: oldDate }],
          [],
        ],
        emailLogCount: 1,
      })
      const { executeRecyclePool } = require('@/lib/cron-jobs/recycle-pool')
      const result = await executeRecyclePool()
      expect(result.skipped).toBe(1)
      expect(result.released).toBe(0)
    })

    it('should handle race condition (updateMany returns 0)', async () => {
      const oldDate = new Date('2020-01-01')
      setupMocks({
        findMany: [
          [{ id: 'c5', tenantId: 't1', ownerId: 'u1', claimedAt: oldDate, lastActivityAt: oldDate }],
          [],
        ],
        updateManyCount: 0,
      })
      const { executeRecyclePool } = require('@/lib/cron-jobs/recycle-pool')
      const result = await executeRecyclePool()
      expect(result.skipped).toBe(1)
      expect(result.released).toBe(0)
    })

    it('should be idempotent on second run', async () => {
      const oldDate = new Date('2020-01-01')
      setupMocks({
        findMany: [
          [{ id: 'c6', tenantId: 't1', ownerId: 'u1', claimedAt: oldDate, lastActivityAt: oldDate }],
          [],
        ],
      })
      const { executeRecyclePool } = require('@/lib/cron-jobs/recycle-pool')
      const r1 = await executeRecyclePool()
      expect(r1.released).toBe(1)

      // Second run: no candidates
      setupMocks({ findMany: [] })
      const r2 = await executeRecyclePool()
      expect(r2.released).toBe(0)
      expect(r2.scanned).toBe(0)
    })

    it('should process in batches with cursor pagination', async () => {
      const oldDate = new Date('2020-01-01')
      const batch = Array.from({ length: 100 }, (_, i) => ({
        id: `c${i}`, tenantId: 't1', ownerId: 'u1',
        claimedAt: oldDate, lastActivityAt: oldDate,
      }))
      setupMocks({})
      mockFindMany
        .mockResolvedValueOnce(batch)
        .mockResolvedValueOnce(batch)
        .mockResolvedValueOnce(batch.slice(0, 5))

      const { executeRecyclePool } = require('@/lib/cron-jobs/recycle-pool')
      const result = await executeRecyclePool()
      expect(result.scanned).toBe(205)
      expect(result.released).toBe(205)
      expect(mockFindMany).toHaveBeenCalledTimes(3)
    })

    it('should include durationMs in result', async () => {
      setupMocks({ findMany: [] })
      const { executeRecyclePool } = require('@/lib/cron-jobs/recycle-pool')
      const result = await executeRecyclePool()
      expect(typeof result.durationMs).toBe('number')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })
  })

  describe('dispatchCronJob inline fallback', () => {
    it('should execute inline when Redis unavailable', async () => {
      setupMocks({ findMany: [] })
      const { dispatchCronJob } = require('@/lib/cron-queue')
      const result = await dispatchCronJob('recycle-pool')
      expect(result).toHaveProperty('queued')
      expect(result).toHaveProperty('result')
      expect(result.result).toHaveProperty('scanned')
    })
  })
})
