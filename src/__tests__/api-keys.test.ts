/**
 * API Key + Webhook integration tests
 * Tests the API key auth flow and webhook management
 */

import { generateApiKey, hashApiKey, computeEffectivePermissions } from '@/lib/api-key'
import crypto from 'crypto'

describe('API Key utilities', () => {
  test('generateApiKey returns raw, hash, and prefix', () => {
    const { raw, hash, prefix } = generateApiKey()
    expect(raw).toMatch(/^oh_[a-f0-9]{64}$/)
    expect(hash).toHaveLength(64) // SHA-256 hex
    expect(prefix).toHaveLength(11) // "oh_" + 8 hex chars
    expect(raw.startsWith(prefix)).toBe(true)
  })

  test('hashApiKey produces consistent SHA-256 hash', () => {
    const key = 'oh_abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    const hash1 = hashApiKey(key)
    const hash2 = hashApiKey(key)
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64)
  })

  test('generateApiKey produces unique keys', () => {
    const key1 = generateApiKey()
    const key2 = generateApiKey()
    expect(key1.raw).not.toBe(key2.raw)
    expect(key1.hash).not.toBe(key2.hash)
  })

  test('hashApiKey uses SHA-256', () => {
    const key = 'oh_test1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab'
    const hash = hashApiKey(key)
    const expected = crypto.createHash('sha256').update(key).digest('hex')
    expect(hash).toBe(expected)
  })
})

describe('Webhook signature', () => {
  test('signWebhook produces consistent HMAC', async () => {
    const { signWebhook } = await import('@/lib/webhook-dispatch')
    const secret = 'test-secret-key'
    const body = '{"event":"test"}'
    const sig1 = signWebhook(secret, body)
    const sig2 = signWebhook(secret, body)
    expect(sig1).toBe(sig2)
    expect(sig1).toHaveLength(64) // SHA-256 hex
  })

  test('signWebhook produces different signatures for different secrets', async () => {
    const { signWebhook } = await import('@/lib/webhook-dispatch')
    const body = '{"event":"test"}'
    const sig1 = signWebhook('secret1', body)
    const sig2 = signWebhook('secret2', body)
    expect(sig1).not.toBe(sig2)
  })

  test('signWebhook produces different signatures for different bodies', async () => {
    const { signWebhook } = await import('@/lib/webhook-dispatch')
    const secret = 'test-secret'
    const sig1 = signWebhook(secret, '{"event":"a"}')
    const sig2 = signWebhook(secret, '{"event":"b"}')
    expect(sig1).not.toBe(sig2)
  })
})

describe('API Key permission mapping', () => {
  test('contacts:read grants view but not manage', () => {
    const perms = computeEffectivePermissions(['contacts:read'])
    expect(perms).toContain('contacts:view')
    expect(perms).not.toContain('contacts:manage')
  })

  test('contacts:write grants manage and view', () => {
    const perms = computeEffectivePermissions(['contacts:write'])
    expect(perms).toContain('contacts:manage')
    expect(perms).toContain('contacts:view')
  })
})
