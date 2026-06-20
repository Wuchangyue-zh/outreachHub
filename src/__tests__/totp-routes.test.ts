const mockUserFindUnique = jest.fn()
const mockUserUpdateMany = jest.fn()
const mockVerifyAuthToken = jest.fn()
const mockVerifyTOTP = jest.fn()
const mockGenerateTOTPSecret = jest.fn()
const mockGenerateBackupCodes = jest.fn()
const mockHashBackupCodes = jest.fn()
const mockVerifyBackupCode = jest.fn()
const mockWriteAuditLog = jest.fn()
const mockVerify2FAToken = jest.fn()
const mockGenerateToken = jest.fn()
const mockRateLimitCheck = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) =>
        mockUserFindUnique(...args),
      updateMany: (...args: unknown[]) =>
        mockUserUpdateMany(...args),
    },
  },
}))
jest.mock('@/lib/auth-middleware', () => ({
  verifyAuthToken: (...args: unknown[]) =>
    mockVerifyAuthToken(...args),
}))
jest.mock('@/lib/two-factor', () => ({
  verifyTOTP: (...args: unknown[]) => mockVerifyTOTP(...args),
  generateTOTPSecret: (...args: unknown[]) =>
    mockGenerateTOTPSecret(...args),
  generateBackupCodes: (...args: unknown[]) =>
    mockGenerateBackupCodes(...args),
  hashBackupCodes: (...args: unknown[]) =>
    mockHashBackupCodes(...args),
  verifyBackupCode: (...args: unknown[]) =>
    mockVerifyBackupCode(...args),
}))
jest.mock('@/lib/audit', () => ({
  writeAuditLog: (...args: unknown[]) =>
    mockWriteAuditLog(...args),
}))
jest.mock('@/lib/jwt', () => ({
  verify2FAToken: (...args: unknown[]) =>
    mockVerify2FAToken(...args),
  generateToken: (...args: unknown[]) =>
    mockGenerateToken(...args),
}))
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: () => ({
    check: (...args: unknown[]) => mockRateLimitCheck(...args),
  }),
}))

import { NextRequest } from 'next/server'
import { encrypt } from '@/lib/encryption'
import { POST as enable2FA } from '@/app/api/auth/2fa/enable/route'
import { POST as verify2FA } from '@/app/api/auth/2fa/verify/route'
import { POST as disable2FA } from '@/app/api/auth/2fa/disable/route'
import { POST as verifyLogin2FA } from '@/app/api/auth/login/verify-2fa/route'

const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'
const KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

function jsonRequest(path: string, body: Record<string, unknown>) {
  return new NextRequest('http://localhost' + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_1',
    email: 'parent@example.com',
    name: 'Parent',
    role: 'USER',
    tenantId: 'tenant_1',
    tenant: { id: 'tenant_1' },
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorBackupCodes: null,
    ...overrides,
  }
}

describe('TOTP routes use encrypted storage safely', () => {
  const originalKey = process.env.ENCRYPTION_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ENCRYPTION_KEY = KEY
    mockRateLimitCheck.mockResolvedValue(null)
    mockVerifyAuthToken.mockResolvedValue({
      success: true,
      userId: 'user_1',
      tenantId: 'tenant_1',
      role: 'USER',
    })
    mockVerifyTOTP.mockReturnValue(true)
    mockGenerateTOTPSecret.mockReturnValue({
      secret: SECRET,
      otpauthUrl: 'otpauth://totp/OutreachHub',
    })
    mockGenerateBackupCodes.mockReturnValue(['BACKUP01'])
    mockHashBackupCodes.mockResolvedValue(['hashed-backup'])
    mockVerifyBackupCode.mockResolvedValue(-1)
    mockWriteAuditLog.mockResolvedValue(undefined)
    mockVerify2FAToken.mockReturnValue({ userId: 'user_1' })
    mockGenerateToken.mockReturnValue('signed-jwt')
    mockUserUpdateMany.mockResolvedValue({ count: 1 })
  })

  afterAll(() => {
    if (originalKey === undefined) delete process.env.ENCRYPTION_KEY
    else process.env.ENCRYPTION_KEY = originalKey
  })

  it('stores a versioned ciphertext during setup', async () => {
    mockUserFindUnique.mockResolvedValue(user())

    const response = await enable2FA(
      jsonRequest('/api/auth/2fa/enable', {})
    )

    expect(response.status).toBe(200)
    expect(mockUserUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'user_1',
          twoFactorEnabled: false,
          twoFactorSecret: null,
        }),
        data: {
          twoFactorSecret: expect.stringMatching(/^enc:v1:/),
        },
      })
    )
    const stored =
      mockUserUpdateMany.mock.calls[0][0].data.twoFactorSecret
    expect(stored).not.toContain(SECRET)
  })

  it('enables 2FA and migrates legacy unversioned ciphertext atomically', async () => {
    const legacyEncrypted = encrypt(SECRET)
    mockUserFindUnique.mockResolvedValue(
      user({ twoFactorSecret: legacyEncrypted })
    )

    const response = await verify2FA(
      jsonRequest('/api/auth/2fa/verify', { code: '123456' })
    )

    expect(response.status).toBe(200)
    expect(mockVerifyTOTP).toHaveBeenCalledWith(
      '123456',
      SECRET
    )
    expect(mockUserUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'user_1',
          twoFactorEnabled: false,
          twoFactorSecret: legacyEncrypted,
        },
        data: expect.objectContaining({
          twoFactorEnabled: true,
          twoFactorSecret: expect.stringMatching(/^enc:v1:/),
        }),
      })
    )
  })

  it('rejects enable confirmation when a concurrent setup changed the secret', async () => {
    mockUserFindUnique.mockResolvedValue(
      user({ twoFactorSecret: SECRET })
    )
    mockUserUpdateMany.mockResolvedValue({ count: 0 })

    const response = await verify2FA(
      jsonRequest('/api/auth/2fa/verify', { code: '123456' })
    )

    expect(response.status).toBe(409)
    expect(mockWriteAuditLog).not.toHaveBeenCalled()
  })

  it('conditionally clears the secret and backup codes when disabling', async () => {
    mockUserFindUnique.mockResolvedValue(
      user({
        twoFactorEnabled: true,
        twoFactorSecret: SECRET,
        twoFactorBackupCodes: '["hash"]',
      })
    )

    const response = await disable2FA(
      jsonRequest('/api/auth/2fa/disable', {
        code: '123456',
      })
    )

    expect(response.status).toBe(200)
    expect(mockUserUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'user_1',
        twoFactorEnabled: true,
        twoFactorSecret: SECRET,
      },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    })
  })

  it('migrates legacy plaintext only after a successful login TOTP', async () => {
    mockUserFindUnique.mockResolvedValue(
      user({
        twoFactorEnabled: true,
        twoFactorSecret: SECRET,
      })
    )

    const response = await verifyLogin2FA(
      jsonRequest('/api/auth/login/verify-2fa', {
        tempToken: 'temp-token',
        code: '123456',
      })
    )

    expect(response.status).toBe(200)
    expect(mockVerifyTOTP).toHaveBeenCalledWith(
      '123456',
      SECRET
    )
    expect(mockUserUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'user_1',
          twoFactorSecret: SECRET,
        },
        data: {
          twoFactorSecret: expect.stringMatching(/^enc:v1:/),
        },
      })
    )
  })

  it('does not migrate or issue a login token for an invalid TOTP', async () => {
    mockVerifyTOTP.mockReturnValue(false)
    mockUserFindUnique.mockResolvedValue(
      user({
        twoFactorEnabled: true,
        twoFactorSecret: SECRET,
      })
    )

    const response = await verifyLogin2FA(
      jsonRequest('/api/auth/login/verify-2fa', {
        tempToken: 'temp-token',
        code: '000000',
      })
    )

    expect(response.status).toBe(400)
    expect(mockUserUpdateMany).not.toHaveBeenCalled()
    expect(mockGenerateToken).not.toHaveBeenCalled()
  })
})
