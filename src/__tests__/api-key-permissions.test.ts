import { NextRequest } from 'next/server'
import { computeEffectivePermissions } from '@/lib/api-key'
import { hasPermission, canReadContacts, resolveAuth } from '@/lib/auth-middleware'
import { consumeApiKeyRateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { GET as listContacts, POST as createContact } from '@/app/api/v1/contacts/route'
import { GET as getContact } from '@/app/api/v1/contacts/[id]/route'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    company: { findFirst: jest.fn() },
    contactEmail: { createMany: jest.fn() },
  },
}))

jest.mock('@/lib/auth-middleware', () => {
  const actual = jest.requireActual('@/lib/auth-middleware')
  return { ...actual, resolveAuth: jest.fn() }
})

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({ check: jest.fn().mockResolvedValue(null) }),
  consumeApiKeyRateLimit: jest.fn(),
}))

jest.mock('@/lib/plan-limits', () => ({
  checkContactLimit: jest.fn().mockResolvedValue({ allowed: true, current: 0, max: 100 }),
}))

const mockedResolveAuth = resolveAuth as jest.MockedFunction<typeof resolveAuth>
const mockedConsume = consumeApiKeyRateLimit as jest.MockedFunction<typeof consumeApiKeyRateLimit>
const rateHeaders = {
  'X-RateLimit-Limit': '10',
  'X-RateLimit-Remaining': '9',
  'X-RateLimit-Reset': '2000000000',
}

function request(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`http://localhost:3030${path}`, init)
}

describe('P2-4 API key permission enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedConsume.mockResolvedValue({ response: null, headers: rateHeaders })
  })

  test('read scope grants view but not write', () => {
    const permissions = computeEffectivePermissions(['contacts:read'])
    expect(canReadContacts({ role: 'API_KEY', effectivePermissions: permissions })).toBe(true)
    expect(hasPermission('API_KEY', 'contacts:manage', permissions)).toBe(false)
  })

  test('write scope grants both manage and view', () => {
    const permissions = computeEffectivePermissions(['contacts:write'])
    expect(canReadContacts({ role: 'API_KEY', effectivePermissions: permissions })).toBe(true)
    expect(hasPermission('API_KEY', 'contacts:manage', permissions)).toBe(true)
  })

  test('GET enforces the API key tenant in both queries', async () => {
    mockedResolveAuth.mockResolvedValue({
      success: true,
      tenantId: 'tenant-a',
      role: 'API_KEY',
      apiKeyId: 'key-a',
      apiKeyRateLimit: 10,
      effectivePermissions: ['contacts:view'],
    })
    ;(prisma.contact.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.contact.count as jest.Mock).mockResolvedValue(0)

    const response = await listContacts(request('/api/v1/contacts'))

    expect(response.status).toBe(200)
    expect(prisma.contact.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-a' }),
    }))
    expect(prisma.contact.count).toHaveBeenCalledWith({ where: expect.objectContaining({ tenantId: 'tenant-a' }) })
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('9')
  })

  test('POST rejects a read-only API key before consuming quota', async () => {
    mockedResolveAuth.mockResolvedValue({
      success: true,
      tenantId: 'tenant-a',
      role: 'API_KEY',
      apiKeyId: 'key-a',
      effectivePermissions: ['contacts:view'],
    })

    const response = await createContact(request('/api/v1/contacts', {
      method: 'POST',
      body: JSON.stringify({ fullName: 'Read Only' }),
    }))

    expect(response.status).toBe(403)
    expect(mockedConsume).not.toHaveBeenCalled()
    expect(prisma.contact.create).not.toHaveBeenCalled()
  })

  test('POST rejects a company from another tenant', async () => {
    mockedResolveAuth.mockResolvedValue({
      success: true,
      tenantId: 'tenant-a',
      role: 'API_KEY',
      apiKeyId: 'key-a',
      apiKeyRateLimit: 10,
      effectivePermissions: ['contacts:manage'],
    })
    ;(prisma.company.findFirst as jest.Mock).mockResolvedValue(null)

    const response = await createContact(request('/api/v1/contacts', {
      method: 'POST',
      body: JSON.stringify({ fullName: 'Cross Tenant', companyId: 'company-b' }),
    }))

    expect(response.status).toBe(404)
    expect(prisma.company.findFirst).toHaveBeenCalledWith({
      where: { id: 'company-b', tenantId: 'tenant-a' },
      select: { id: true },
    })
    expect(prisma.contact.create).not.toHaveBeenCalled()
  })

  test('detail lookup cannot read another tenant contact', async () => {
    mockedResolveAuth.mockResolvedValue({
      success: true,
      tenantId: 'tenant-a',
      role: 'API_KEY',
      apiKeyId: 'key-a',
      effectivePermissions: ['contacts:view'],
    })
    ;(prisma.contact.findFirst as jest.Mock).mockResolvedValue(null)

    const response = await getContact(
      request('/api/v1/contacts/contact-b'),
      { params: Promise.resolve({ id: 'contact-b' }) }
    )

    expect(response.status).toBe(404)
    expect(prisma.contact.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'contact-b', tenantId: 'tenant-a' },
    }))
  })
})
