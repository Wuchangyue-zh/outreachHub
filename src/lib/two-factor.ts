import { OTP, generateSecret, generateURI } from 'otplib'
import { hash, compare } from 'bcryptjs'
import crypto from 'crypto'

const BCRYPT_PREFIX = '$2'

// Create a TOTP instance with default settings
const totp = new OTP({ strategy: 'totp' })

/**
 * Generate a TOTP secret for the given user.
 */
export function generateTOTPSecret(userEmail: string): { secret: string; otpauthUrl: string } {
  const secret = generateSecret()
  const otpauthUrl = generateURI({
    strategy: 'totp',
    issuer: 'OutreachHub',
    label: userEmail,
    secret,
  })
  return { secret, otpauthUrl }
}

/**
 * Verify a TOTP token against a secret.
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    const result = totp.verifySync({ token, secret })
    return result.valid
  } catch {
    return false
  }
}

/**
 * Generate N backup codes (8-char alphanumeric, uppercase).
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    // 4 bytes = 8 hex chars, uppercase
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
  }
  return codes
}

/**
 * Hash an array of backup codes using bcrypt.
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  const hashed: string[] = []
  for (const code of codes) {
    hashed.push(await hash(code, 10))
  }
  return hashed
}

/**
 * Verify a backup code against the stored hashed codes.
 * Returns the index of the matched code, or -1 if none match.
 */
export async function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): Promise<number> {
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await compare(code, hashedCodes[i])) {
      return i
    }
  }
  return -1
}

/**
 * Check if a value looks like a bcrypt hash.
 */
export function isBcryptHash(value: string): boolean {
  return value.startsWith(BCRYPT_PREFIX)
}
