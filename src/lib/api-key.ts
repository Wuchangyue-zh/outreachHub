import crypto from 'crypto'
import { prisma } from './prisma'
import type { AuthResult } from './auth-middleware'

const KEY_PREFIX = 'oh_'
const KEY_LENGTH = 32 // bytes -> 64 hex chars

/**
 * Maps API key granular permission strings to backend role-equivalent permissions.
 * e.g. 'contacts:read' and 'contacts:write' both map to 'contacts:manage'
 */
const PERMISSION_MAP: Record<string, string[]> = {
  'contacts:read':   ['contacts:view'],
  'contacts:write':  ['contacts:manage', 'contacts:view'],
  'contacts:manage': ['contacts:manage', 'contacts:view'],
  'campaigns:read':  ['campaigns:view'],
  'campaigns:write': ['campaigns:manage', 'campaigns:view'],
  'campaigns:manage':['campaigns:manage', 'campaigns:view'],
  'templates:read':  ['templates:manage'],
  'templates:write': ['templates:manage'],
  'templates:manage':['templates:manage'],
  'settings:read':   ['settings:manage'],
  'settings:write':  ['settings:manage'],
  'settings:manage': ['settings:manage'],
  'inbox:read':      ['inbox:manage'],
  'inbox:write':     ['inbox:manage'],
  'inbox:manage':    ['inbox:manage'],
  'deals:read':      ['deals:manage'],
  'deals:write':     ['deals:manage'],
  'deals:manage':    ['deals:manage'],
  'reports:read':    ['reports:view'],
  'reports:view':    ['reports:view'],
  'audit:read':      ['audit:view'],
  'audit:view':      ['audit:view'],
  'billing:read':    ['billing:manage'],
  'billing:write':   ['billing:manage'],
  'billing:manage':  ['billing:manage'],
}

function computeEffectivePermissions(keyPermissions: string[]): string[] {
  const mapped = keyPermissions.flatMap(p => PERMISSION_MAP[p] || [])
  return [...new Set(mapped)]
}

export { computeEffectivePermissions }

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = KEY_PREFIX + crypto.randomBytes(KEY_LENGTH).toString('hex')
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  const prefix = raw.substring(0, 11) // "oh_" + first 8 hex chars
  return { raw, hash, prefix }
}

export function hashApiKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

/**
 * Verify an API key and return auth result.
 * Returns the same AuthResult shape as verifyAuthToken.
 */
export async function verifyApiKey(req: Request): Promise<AuthResult & { apiKeyId?: string }> {
  // Check x-api-key header first, then Authorization: Bearer
  let key = req.headers.get('x-api-key')
  if (!key) {
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer oh_')) {
      key = authHeader.substring(7)
    }
  }

  if (!key || !key.startsWith(KEY_PREFIX)) {
    return { success: false, error: 'No API key provided' }
  }

  const hash = hashApiKey(key)

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    include: { tenant: { select: { id: true, plan: true } } },
  })

  if (!apiKey) {
    return { success: false, error: 'Invalid API key' }
  }

  if (!apiKey.isActive) {
    return { success: false, error: 'API key is disabled' }
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { success: false, error: 'API key has expired' }
  }

  // Update lastUsedAt (fire-and-forget)
  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {})

  return {
    success: true,
    userId: apiKey.userId,
    tenantId: apiKey.tenantId || undefined,
    role: 'API_KEY',
    effectivePermissions: computeEffectivePermissions(apiKey.permissions),
    apiKeyId: apiKey.id,
    apiKeyRateLimit: apiKey.rateLimit,
  }
}
