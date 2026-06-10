import Redis from 'ioredis'
import type { ConnectionOptions } from 'bullmq'

let redis: Redis | null = null

export function getRedisConnection(): ConnectionOptions | null {
  if (process.env.REDIS_URL) {
    return {
      url: process.env.REDIS_URL,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    }
  }

  if (process.env.REDIS_HOST) {
    return {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    }
  }

  return null
}

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not configured, caching disabled')
    return null
  }

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('Redis connection failed after 3 retries')
          return null
        }
        return Math.min(times * 200, 2000)
      },
    })

    redis.on('error', (err) => {
      console.error('Redis error:', err)
    })

    redis.on('connect', () => {
      console.log('Redis connected')
    })
  }

  return redis
}

export interface CacheOptions {
  ttl?: number // Time to live in seconds (default: 300 = 5 minutes)
  prefix?: string // Cache key prefix
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis()
  if (!client) return null

  try {
    const cached = await client.get(key)
    if (cached) {
      return JSON.parse(cached) as T
    }
  } catch (error) {
    console.error('Cache get error:', error)
  }

  return null
}

export async function cacheSet<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  const client = getRedis()
  if (!client) return

  const { ttl = 300 } = options

  try {
    await client.setex(key, ttl, JSON.stringify(value))
  } catch (error) {
    console.error('Cache set error:', error)
  }
}

export async function cacheDelete(key: string): Promise<void> {
  const client = getRedis()
  if (!client) return

  try {
    await client.del(key)
  } catch (error) {
    console.error('Cache delete error:', error)
  }
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  const client = getRedis()
  if (!client) return

  try {
    let cursor = '0'
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = nextCursor
      if (keys.length > 0) {
        await client.del(...keys)
      }
    } while (cursor !== '0')
  } catch (error) {
    console.error('Cache delete pattern error:', error)
  }
}

export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try to get from cache first
  const cached = await cacheGet<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch fresh data
  const data = await fetchFn()

  // Store in cache
  await cacheSet(key, data, options)

  return data
}
