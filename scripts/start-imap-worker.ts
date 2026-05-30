#!/usr/bin/env node
import { validateEnv } from '../src/lib/env'
import { createImapWorker } from '../src/lib/imap-queue'
import { startWorkerHealthServer } from '../src/lib/worker-health'

validateEnv()

console.log('Starting IMAP Worker...')
const worker = createImapWorker()
startWorkerHealthServer(parseInt(process.env.IMAP_WORKER_HEALTH_PORT || '8081', 10))

const shutdown = async (signal: string) => {
  console.log(`\n[${signal}] Shutting down IMAP worker...`)
  await worker.close()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

console.log('IMAP Worker started. Waiting for jobs...')
