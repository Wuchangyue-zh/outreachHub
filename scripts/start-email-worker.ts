#!/usr/bin/env node
import { validateEnv } from '../src/lib/env'
import { createEmailWorker } from '../src/lib/email-worker'
import { startWorkerHealthServer } from '../src/lib/worker-health'
import { getWorkerConcurrency, getWorkerRateLimit } from '../src/lib/env'
import { logger } from '../src/lib/logger'

const log = logger.child({ worker: 'email' })

validateEnv()

const rateLimit = getWorkerRateLimit()
log.info('Starting Email Worker', {
  redisConfigured: !!process.env.REDIS_URL,
  concurrency: getWorkerConcurrency(5),
  rateLimitMax: rateLimit.max,
  rateLimitDurationMs: rateLimit.duration,
})

const worker = createEmailWorker()
startWorkerHealthServer()

log.info('Email Worker started, waiting for jobs')

const shutdown = async (signal: string) => {
  log.info('Shutting down email worker', { signal })
  await worker.close()
  log.info('Email worker stopped')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception', { error: error.message, stack: error.stack })
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection', { reason: String(reason), promise: String(promise) })
  process.exit(1)
})
