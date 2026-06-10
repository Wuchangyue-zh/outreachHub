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
 * Check rate limit for a specific API key (uses apiKeyId as the rate limit key).
 * Falls back to IP-based limiting if no apiKeyId is provided.
 */
export async function checkApiKeyRateLimit(
  req: NextRequest,
  apiKeyId: string | undefined,
  limit: number,
  intervalMs: number = 60000
): Promise<NextResponse | null> {
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return null
  }

  const key = apiKeyId
    ? `apikey:${apiKeyId}`
    : `ip:${req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'anonymous'}:${req.nextUrl.pathname}`

  const result = await redisRateLimitCheck(key, limit, intervalMs)
  if (!result.allowed) {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试' },
      {
        status: 429,
        headers: { 'Retry-After': String(result.retryAfter || Math.ceil(intervalMs / 1000)) },
      }
    )
  }
  return null
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
  setInterval(() => {
    const now = Date.now()
    for (const key in memoryStore) {
      if (now - memoryStore[key].lastReset > 300000) {
        delete memoryStore[key]
      }
    }
  }, 60000)
}
