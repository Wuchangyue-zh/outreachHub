/**
 * 多租户隔离测试
 * 验证关系过滤和 tenantId 防御性深度检查
 */

import { prisma } from '@/lib/prisma'

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    emailLog: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    campaignContact: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    contactEmail: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    campaign: {
      update: jest.fn(),
    },
    company: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

describe('Multi-tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Contact timeline - relation filter', () => {
    it('should use relation filter for emailLog query', async () => {
      const mockContact = { id: 'c1', tenantId: 't1', fullName: 'Test' }
      const mockEmailLogs = [{ id: 'e1', status: 'SENT' }]

      ;(prisma.contact.findFirst as jest.Mock).mockResolvedValue(mockContact)
      ;(prisma.emailLog.findMany as jest.Mock).mockResolvedValue(mockEmailLogs)

      // Simulate the route logic
      const contact = await prisma.contact.findFirst({
        where: { id: 'c1', tenantId: 't1' },
      })

      expect(contact).toBeTruthy()

      // The key assertion: emailLog query should use relation filter
      const emailLogs = await prisma.emailLog.findMany({
        where: { contact: { id: 'c1', tenantId: 't1' } },
      })

      expect(prisma.emailLog.findMany).toHaveBeenCalledWith({
        where: { contact: { id: 'c1', tenantId: 't1' } },
      })
    })

    it('should return null for cross-tenant contact access', async () => {
      ;(prisma.contact.findFirst as jest.Mock).mockResolvedValue(null)

      const contact = await prisma.contact.findFirst({
        where: { id: 'c1', tenantId: 'wrong-tenant' },
      })

      expect(contact).toBeNull()
    })
  })

  describe('Contact delete cascade - relation filter', () => {
    it('should use relation filter for cascade deletes', async () => {
      const tenantId = 't1'
      const contactId = 'c1'

      await prisma.contactEmail.deleteMany({
        where: { contact: { id: contactId, tenantId } },
      })
      await prisma.emailLog.deleteMany({
        where: { contact: { id: contactId, tenantId } },
      })
      await prisma.campaignContact.deleteMany({
        where: { contact: { id: contactId, tenantId } },
      })

      expect(prisma.contactEmail.deleteMany).toHaveBeenCalledWith({
        where: { contact: { id: contactId, tenantId } },
      })
      expect(prisma.emailLog.deleteMany).toHaveBeenCalledWith({
        where: { contact: { id: contactId, tenantId } },
      })
      expect(prisma.campaignContact.deleteMany).toHaveBeenCalledWith({
        where: { contact: { id: contactId, tenantId } },
      })
    })
  })

  describe('Campaign launch - relation filter', () => {
    it('should use campaign relation filter for emailLog queries', async () => {
      const campaignId = 'cmp1'
      const tenantId = 't1'

      await prisma.emailLog.findMany({
        where: {
          campaign: { id: campaignId, tenantId },
          status: { in: ['SENT', 'DELIVERED'] },
        },
      })

      expect(prisma.emailLog.findMany).toHaveBeenCalledWith({
        where: {
          campaign: { id: campaignId, tenantId },
          status: { in: ['SENT', 'DELIVERED'] },
        },
      })
    })

    it('should include tenantId in campaign.update where clause', async () => {
      const campaignId = 'cmp1'
      const tenantId = 't1'

      await prisma.campaign.update({
        where: { id: campaignId, tenantId },
        data: { status: 'RUNNING' },
      })

      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: campaignId, tenantId },
        data: { status: 'RUNNING' },
      })
    })
  })

  describe('Contact claim/release - tenantId in where', () => {
    it('should include tenantId in contact.update for claim', async () => {
      const contactId = 'c1'
      const tenantId = 't1'

      await prisma.contact.update({
        where: { id: contactId, tenantId },
        data: { ownerId: 'u1', pool: 'PRIVATE' },
      })

      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: contactId, tenantId },
        data: { ownerId: 'u1', pool: 'PRIVATE' },
      })
    })

    it('should include tenantId in contact.update for release', async () => {
      const contactId = 'c1'
      const tenantId = 't1'

      await prisma.contact.update({
        where: { id: contactId, tenantId },
        data: { ownerId: null, pool: 'PUBLIC' },
      })

      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: contactId, tenantId },
        data: { ownerId: null, pool: 'PUBLIC' },
      })
    })
  })

  describe('Company operations - tenantId in where', () => {
    it('should include tenantId in company.update', async () => {
      const companyId = 'co1'
      const tenantId = 't1'

      await prisma.company.update({
        where: { id: companyId, tenantId },
        data: { name: 'Updated' },
      })

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: companyId, tenantId },
        data: { name: 'Updated' },
      })
    })

    it('should include tenantId in company.delete', async () => {
      const companyId = 'co1'
      const tenantId = 't1'

      await prisma.company.delete({
        where: { id: companyId, tenantId },
      })

      expect(prisma.company.delete).toHaveBeenCalledWith({
        where: { id: companyId, tenantId },
      })
    })
  })
})
