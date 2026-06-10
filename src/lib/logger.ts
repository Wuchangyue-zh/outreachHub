/**
 * L2: 结构化日志 — 统一 JSON 格式，便于生产环境日志采集（ELK / Datadog / Vercel Logs）
 *
 * 用法：
 *   import { logger } from '@/lib/logger'
 *   logger.info('Campaign launched', { campaignId, count: 100 })
 *   logger.error('Send failed', { emailLogId, error: err.message })
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  [key: string]: unknown
}

function formatEntry(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  }
  return JSON.stringify(entry)
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'production') return // 生产不输出 debug
    console.debug(formatEntry('debug', message, meta))
  },

  info(message: string, meta?: Record<string, unknown>) {
    console.log(formatEntry('info', message, meta))
  },

  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(formatEntry('warn', message, meta))
  },

  error(message: string, meta?: Record<string, unknown>) {
    console.error(formatEntry('error', message, meta))
  },

  /** 子 logger（自动附加固定上下文，如 worker/cron 名称） */
  child(context: Record<string, unknown>) {
    return {
      debug: (msg: string, meta?: Record<string, unknown>) => logger.debug(msg, { ...context, ...meta }),
      info: (msg: string, meta?: Record<string, unknown>) => logger.info(msg, { ...context, ...meta }),
      warn: (msg: string, meta?: Record<string, unknown>) => logger.warn(msg, { ...context, ...meta }),
      error: (msg: string, meta?: Record<string, unknown>) => logger.error(msg, { ...context, ...meta }),
    }
  },
}
