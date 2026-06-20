import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from './redis'

interface RateLimitConfig {
  interval: number
  uniqueTokenPerInterval: number
}

interface MemoryEntry {
  count: number
  lastReset: number
}

const memoryStore: Record<string, MemoryEntry> = {}

const REDIS_PREFIX = 'ratelimit:'

async function redisRateLimitCheck(
  key: string,
  limit: number,
  intervalMs: number
): Promise<{ allowed: boolean; retryAfter: number }> {
  const client = getRedis()
  if (!client) {
    return memoryRateLimitCheck(key, limit, intervalMs)
  }

  const redisKey = `${REDIS_PREFIX}${key}`
  const windowSec = Math.ceil(intervalMs / 1000)

  try {
    const count = await client.incr(redisKey)
    if (count === 1) {
      await client.expire(redisKey, windowSec)
    }
    if (count > limit) {
      const ttl = await client.ttl(redisKey)
      return { allowed: false, retryAfter: ttl > 0 ? ttl : windowSec }
    }
    return { allowed: true, retryAfter: 0 }
  } catch {
    return memoryRateLimitCheck(key, limit, intervalMs)
  }
}

function memoryRateLimitCheck(
  key: string,
  limit: number,
  intervalMs: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  if (!memoryStore[key] || now - memoryStore[key].lastReset > intervalMs) {
    memoryStore[key] = { count: 1, lastReset: now }
    return { allowed: true, retryAfter: 0 }
  }
  if (memoryStore[key].count >= limit) {
    const retryAfter = Math.ceil((intervalMs - (now - memoryStore[key].lastReset)) / 1000)
    return { allowed: false, retryAfter }
  }
  memoryStore[key].count++
  return { allowed: true, retryAfter: 0 }
}

export function rateLimit(config: RateLimitConfig = { interval: 60000, uniqueTokenPerInterval: 100 }) {
  return {
    check: async (req: NextRequest, limit: number = 10): Promise<NextResponse | null> => {
      if (process.env.DISABLE_RATE_LIMIT === 'true') {
        return null
      }

      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || 'anonymous'
      const key = `${ip}:${req.nextUrl.pathname}`

      const result = await redisRateLimitCheck(key, limit, config.interval)
      if (!result.allowed) {
        return NextResponse.json(
          { error: '请求过于频繁，请稍后再试' },
          {
            status: 429,
            headers: { 'Retry-After': String(result.retryAfter || Math.ceil(config.interval / 1000)) },
          }
        )
      }
      return null
    },
  }
}

/**
 * Rate limit check result with headers for inclusion in successful responses.
 */
export interface RateLimitHeaders {
  [key: string]: string
  'X-RateLimit-Limit': string
  'X-RateLimit-Remaining': string
  'X-RateLimit-Reset': string
}

export interface ApiKeyRateLimitResult {
  response: NextResponse | null
  headers: RateLimitHeaders
}

const API_KEY_RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if count == 1 or ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { count, ttl }
`

/**
 * Consume one request from an API key's distributed limit.
 * API key limits deliberately fail closed when Redis is unavailable: a
 * process-local fallback would let callers multiply their allowance by the
 * number of web instances.
 */
export async function consumeApiKeyRateLimit(
  apiKeyId: string,
  limit: number,
  intervalMs: number = 60000
): Promise<ApiKeyRateLimitResult> {
  const windowSec = Math.ceil(intervalMs / 1000)
  const resetFallback = Math.ceil(Date.now() / 1000) + windowSec
  const disabledHeaders: RateLimitHeaders = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(limit),
    'X-RateLimit-Reset': String(resetFallback),
  }

  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return { response: null, headers: disabledHeaders }
  }

  const client = getRedis()
  if (!client) {
    return {
      response: NextResponse.json(
        { success: false, error: { code: 'RATE_LIMIT_UNAVAILABLE', message: '限流服务暂不可用' } },
        { status: 503, headers: { 'Retry-After': '5' } }
      ),
      headers: disabledHeaders,
    }
  }

  try {
    const redisKey = `${REDIS_PREFIX}apikey:${apiKeyId}`
    const result = await client.eval(API_KEY_RATE_LIMIT_SCRIPT, 1, redisKey, windowSec) as [number, number]
    const count = Number(result[0])
    const ttl = Number(result[1])
    const retryAfter = ttl > 0 ? ttl : windowSec
    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(Math.max(0, limit - count)),
      'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + retryAfter),
    }

    if (count > limit) {
      return {
        response: NextResponse.json(
          {
            success: false,
            error: { code: 'RATE_LIMIT_EXCEEDED', message: '请求过于频繁，请稍后再试' },
            retryAfter,
          },
          {
            status: 429,
            headers: { ...headers, 'Retry-After': String(retryAfter) },
          }
        ),
        headers,
      }
    }

    return { response: null, headers }
  } catch {
    return {
      response: NextResponse.json(
        { success: false, error: { code: 'RATE_LIMIT_UNAVAILABLE', message: '限流服务暂不可用' } },
        { status: 503, headers: { 'Retry-After': '5' } }
      ),
      headers: disabledHeaders,
    }
  }
}

/**
 * Build the rate limit key for an API key or fallback to IP.
 */
export function buildApiKeyRateLimitKey(
  req: NextRequest,
  apiKeyId: string | undefined
): string {
  if (apiKeyId) return `apikey:${apiKeyId}`
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'anonymous'
  return `ip:${ip}:${req.nextUrl.pathname}`
}

/**
 * Check rate limit for a specific API key (uses apiKeyId as the rate limit key).
 * Falls back to IP-based limiting if no apiKeyId is provided.
 * Returns 429 NextResponse with rate limit headers on limit exceeded, null if allowed.
 */
export async function checkApiKeyRateLimit(
  req: NextRequest,
  apiKeyId: string | undefined,
  limit: number,
  intervalMs: number = 60000
): Promise<NextResponse | null> {
  if (apiKeyId) return (await consumeApiKeyRateLimit(apiKeyId, limit, intervalMs)).response

  const key = buildApiKeyRateLimitKey(req, undefined)
  const result = await redisRateLimitCheck(key, limit, intervalMs)
  return result.allowed
    ? null
    : NextResponse.json(
      { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: '请求过于频繁，请稍后再试' } },
      { status: 429, headers: { 'Retry-After': String(result.retryAfter || Math.ceil(intervalMs / 1000)) } }
    )
}

/**
 * Higher-order wrapper that adds rate limiting to a route handler.
 * Usage: export const POST = withRateLimit(handler, { limit: 10 })
 */
export function withRateLimit(
  handler: (req: NextRequest, ctx?: any) => Promise<NextResponse>,
  options: { limit?: number; interval?: number } = {}
) {
  const limiter = rateLimit({ interval: options.interval || 60000, uniqueTokenPerInterval: 100 })
  const limit = options.limit || 10

  return async (req: NextRequest, ctx?: any) => {
    const rateLimitResult = await limiter.check(req, limit)
    if (rateLimitResult) return rateLimitResult
    return handler(req, ctx)
  }
}

if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const key in memoryStore) {
      if (now - memoryStore[key].lastReset > 300000) {
        delete memoryStore[key]
      }
    }
  }, 60000)
  cleanupTimer.unref?.()
}
