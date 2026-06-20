const mockUpdateMany = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}))

import { encrypt } from '@/lib/encryption'
import {
  decryptTotpSecret,
  decryptTotpSecretWithMigration,
  encryptTotpSecret,
  isEncryptedTotpSecret,
  isLegacyEncryptedTotpSecret,
  isLegacyPlaintext,
  migrateTotpSecret,
} from '@/lib/totp-secret'

const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'
const KEY_A =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
const KEY_B =
  'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'

describe('TOTP secret encryption and migration', () => {
  const originalKey = process.env.ENCRYPTION_KEY
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ENCRYPTION_KEY = KEY_A
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'test'
    mockUpdateMany.mockResolvedValue({ count: 1 })
  })

  afterAll(() => {
    if (originalKey === undefined) delete process.env.ENCRYPTION_KEY
    else process.env.ENCRYPTION_KEY = originalKey
    ;(process.env as Record<string, string | undefined>).NODE_ENV = originalNodeEnv
  })

  it('writes a versioned ciphertext without plaintext', () => {
    const encrypted = encryptTotpSecret(SECRET)

    expect(encrypted).toMatch(/^enc:v1:/)
    expect(encrypted).not.toContain(SECRET)
  })

  it('round-trips a versioned ciphertext', () => {
    expect(decryptTotpSecret(encryptTotpSecret(SECRET))).toBe(SECRET)
  })

  it('recognizes only the versioned ciphertext prefix as current', () => {
    expect(isEncryptedTotpSecret(encryptTotpSecret(SECRET))).toBe(true)
    expect(isEncryptedTotpSecret(SECRET)).toBe(false)
    expect(isEncryptedTotpSecret(null)).toBe(false)
  })

  it('accepts the actual legacy Base32 plaintext format', () => {
    expect(isLegacyPlaintext(SECRET)).toBe(true)
    expect(
      decryptTotpSecretWithMigration(SECRET)
    ).toEqual({
      secret: SECRET,
      needsMigration: true,
    })
  })

  it('rejects malformed legacy plaintext', () => {
    expect(isLegacyPlaintext('SHORT')).toBe(false)
    expect(
      isLegacyPlaintext(
        'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PX0'
      )
    ).toBe(false)
  })

  it('decrypts and migrates unversioned AES ciphertext from the old enable route', () => {
    const legacyEncrypted = encrypt(SECRET)

    expect(isLegacyEncryptedTotpSecret(legacyEncrypted)).toBe(true)
    expect(
      decryptTotpSecretWithMigration(legacyEncrypted)
    ).toEqual({
      secret: SECRET,
      needsMigration: true,
    })
  })

  it('does not mark current versioned ciphertext for migration', () => {
    expect(
      decryptTotpSecretWithMigration(
        encryptTotpSecret(SECRET)
      )
    ).toEqual({
      secret: SECRET,
      needsMigration: false,
    })
  })

  it('rejects corrupted versioned ciphertext without plaintext fallback', () => {
    expect(() =>
      decryptTotpSecretWithMigration('enc:v1:corrupted')
    ).toThrow()
  })

  it('rejects corrupted legacy ciphertext without plaintext fallback', () => {
    const parts = encrypt(SECRET).split(':')
    parts[1] = '00'.repeat(16)

    expect(() =>
      decryptTotpSecretWithMigration(parts.join(':'))
    ).toThrow()
  })

  it('rejects unrelated colon-separated values', () => {
    expect(() =>
      decryptTotpSecretWithMigration('abc:def:ghi')
    ).toThrow('Invalid TOTP secret format')
  })

  it('rejects an empty value', () => {
    expect(() =>
      decryptTotpSecretWithMigration('')
    ).toThrow('Invalid TOTP secret format')
  })

  it('fails authentication when decrypting with a different key', () => {
    const encrypted = encryptTotpSecret(SECRET)
    process.env.ENCRYPTION_KEY = KEY_B

    expect(() => decryptTotpSecret(encrypted)).toThrow()
  })

  it('rejects a malformed production encryption key', () => {
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
    process.env.ENCRYPTION_KEY = 'not-a-64-character-hex-key'

    expect(() => encryptTotpSecret(SECRET)).toThrow(
      'ENCRYPTION_KEY must be a 64-character hex string'
    )
  })

  it('rejects invalid plaintext before encryption', () => {
    expect(() => encryptTotpSecret('not-base32')).toThrow(
      'Invalid TOTP secret'
    )
  })

  it('migrates with a conditional update on user id and original value', async () => {
    const migrated = await migrateTotpSecret(
      'user_1',
      SECRET,
      SECRET
    )

    expect(migrated).toBe(true)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'user_1',
        twoFactorSecret: SECRET,
      },
      data: {
        twoFactorSecret: expect.stringMatching(/^enc:v1:/),
      },
    })
  })

  it('reports a lost migration race without overwriting another secret', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 })

    await expect(
      migrateTotpSecret('user_1', SECRET, SECRET)
    ).resolves.toBe(false)
  })

  it('does not include the TOTP secret in format errors', () => {
    try {
      decryptTotpSecretWithMigration('invalid')
      throw new Error('expected failure')
    } catch (error) {
      expect((error as Error).message).not.toContain(SECRET)
    }
  })
})
