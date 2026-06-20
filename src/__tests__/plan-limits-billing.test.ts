const mockPrisma = {
  tenant: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  contact: { count: jest.fn() },
  user: { count: jest.fn() },
  campaign: { count: jest.fn() },
  emailLog: { count: jest.fn() },
  invitation: { count: jest.fn() },
}

jest.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import { getTenantLimits } from '@/lib/plan-limits'

describe('billing plan limit enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ignores stale paid limits after a FREE downgrade', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      plan: 'FREE',
      maxContacts: 1000000,
      maxUsers: 50,
      maxEmailsPerDay: 50000,
    })

    await expect(getTenantLimits('tenant_1')).resolves.toEqual({
      maxContacts: 1000,
      maxUsers: 1,
      maxEmailsPerDay: 100,
    })
  })

  it('does not let PRO inherit stale Enterprise limits', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      plan: 'PRO',
      maxContacts: 1000000,
      maxUsers: 50,
      maxEmailsPerDay: 50000,
    })

    await expect(getTenantLimits('tenant_1')).resolves.toEqual({
      maxContacts: 100000,
      maxUsers: 10,
      maxEmailsPerDay: 5000,
    })
  })

  it('preserves explicit custom limits for Enterprise tenants', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      plan: 'ENTERPRISE',
      maxContacts: 2000000,
      maxUsers: 100,
      maxEmailsPerDay: 75000,
    })

    await expect(getTenantLimits('tenant_1')).resolves.toEqual({
      maxContacts: 2000000,
      maxUsers: 100,
      maxEmailsPerDay: 75000,
    })
  })
})
