import { verifyApiKey, areValidApiKeyPermissions } from '@/lib/api-key'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    apiKey: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}))

const storedKey = {
  id: 'key-a',
  userId: 'user-a',
  tenantId: 'tenant-a',
  permissions: ['contacts:read'],
  rateLimit: 25,
  isActive: true,
  expiresAt: null,
  tenant: { id: 'tenant-a', plan: 'PRO' },
}

function request(raw = `oh_${'a'.repeat(64)}`) {
  return new Request('http://localhost/api/v1/contacts', {
    headers: { 'x-api-key': raw },
  })
}

describe('P2-4 API key authentication', () => {
  beforeEach(() => jest.clearAllMocks())

  test('rejects an unknown key', async () => {
    ;(prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(null)
    await expect(verifyApiKey(request())).resolves.toMatchObject({ success: false, error: 'Invalid API key' })
  })

  test('rejects a revoked key', async () => {
    ;(prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({ ...storedKey, isActive: false })
    await expect(verifyApiKey(request())).resolves.toMatchObject({ success: false, error: 'API key is disabled' })
  })

  test('rejects an expired key', async () => {
    ;(prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({ ...storedKey, expiresAt: new Date('2020-01-01') })
    await expect(verifyApiKey(request())).resolves.toMatchObject({ success: false, error: 'API key has expired' })
  })

  test('returns tenant, permissions, id, and limit for a valid key', async () => {
    ;(prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(storedKey)
    await expect(verifyApiKey(request())).resolves.toMatchObject({
      success: true,
      tenantId: 'tenant-a',
      apiKeyId: 'key-a',
      apiKeyRateLimit: 25,
      effectivePermissions: ['contacts:view'],
    })
  })

  test('only documented public scopes can be assigned', () => {
    expect(areValidApiKeyPermissions(['contacts:read', 'campaigns:write'])).toBe(true)
    expect(areValidApiKeyPermissions(['billing:manage'])).toBe(false)
    expect(areValidApiKeyPermissions('contacts:read')).toBe(false)
  })
})
