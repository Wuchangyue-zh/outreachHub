import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  interval: number // 时间窗口（毫秒）
  uniqueTokenPerInterval: number // 每个时间窗口内的唯一请求数
}

interface RateLimitStore {
  [key: string]: {
    count: number
    lastReset: number
  }
}

const store: RateLimitStore = {}

export function rateLimit(config: RateLimitConfig = { interval: 60000, uniqueTokenPerInterval: 100 }) {
  return {
    check: (req: NextRequest, limit: number = 10): NextResponse | null => {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous'
      const key = `${ip}:${req.nextUrl.pathname}`
      const now = Date.now()

      if (!store[key] || now - store[key].lastReset > config.interval) {
        store[key] = { count: 1, lastReset: now }
        return null
      }

      if (store[key].count >= limit) {
        return NextResponse.json(
          { error: '请求过于频繁，请稍后再试' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil(config.interval / 1000)) } }
        )
      }

      store[key].count++
      return null
    },
  }
}

// 定期清理过期的记录
setInterval(() => {
  const now = Date.now()
  for (const key in store) {
    if (now - store[key].lastReset > 300000) {
      delete store[key]
    }
  }
}, 60000)
