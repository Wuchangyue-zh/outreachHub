import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRedis } from '@/lib/redis'

export const dynamic = 'force-dynamic'

/**
 * Lightweight readiness probe for ECS / load balancers.
 * Does not require auth. Avoids leaking secrets.
 */
export async function GET() {
  const checks: Record<string, 'ok' | 'degraded' | 'down'> = {
    app: 'ok',
    database: 'down',
    redis: 'down',
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch {
    checks.database = 'down'
  }

  // 先读 env，避免未配置 REDIS_URL 时 getRedis() 每次探活都 console.warn
  const redisUrl = process.env.REDIS_URL?.trim()
  if (!redisUrl) {
    checks.redis = 'degraded'
  } else {
    try {
      const redis = getRedis()
      if (redis) {
        await redis.ping()
        checks.redis = 'ok'
      } else {
        checks.redis = 'degraded'
      }
    } catch {
      checks.redis = 'down'
    }
  }

  const healthy = checks.database === 'ok'
  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  )
}
