#!/usr/bin/env node
import { createEmailWorker } from '../src/lib/email-worker'

console.log('Starting Email Worker...')
console.log('========================')
console.log(`Redis Host: ${process.env.REDIS_HOST || 'localhost'}`)
console.log(`Redis Port: ${process.env.REDIS_PORT || '6379'}`)
console.log(`Concurrency: 5`)
console.log(`Rate Limit: 100 emails/minute`)
console.log('========================')

const worker = createEmailWorker()

console.log('Email Worker started successfully!')
console.log('Waiting for email jobs...')

// Handle graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n[${signal}] Shutting down email worker...`)
  await worker.close()
  console.log('Email worker stopped.')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Keep the process running
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})
