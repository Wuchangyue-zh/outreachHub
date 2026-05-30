#!/usr/bin/env node
import { validateEnv } from '../src/lib/env'
import { createEmailWorker } from '../src/lib/email-worker'
import { startWorkerHealthServer } from '../src/lib/worker-health'
import { getWorkerConcurrency, getWorkerRateLimit } from '../src/lib/env'

validateEnv()

const rateLimit = getWorkerRateLimit()
console.log('Starting Email Worker...')
console.log('========================')
console.log(`Redis URL: ${process.env.REDIS_URL ? 'configured' : 'missing'}`)
console.log(`Concurrency: ${getWorkerConcurrency(5)}`)
console.log(`Rate Limit: ${rateLimit.max} emails / ${rateLimit.duration}ms`)
console.log('========================')

const worker = createEmailWorker()
startWorkerHealthServer()

console.log('Email Worker started successfully!')
console.log('Waiting for email jobs...')

const shutdown = async (signal: string) => {
  console.log(`\n[${signal}] Shutting down email worker...`)
  await worker.close()
  console.log('Email worker stopped.')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})
