#!/usr/bin/env node
import { validateEnv } from '../src/lib/env'
import { createCronWorker } from '../src/lib/cron-worker'
import { startWorkerHealthServer } from '../src/lib/worker-health'

validateEnv()

const healthPort = parseInt(process.env.CRON_WORKER_HEALTH_PORT || '8082', 10)

console.log('Starting Cron Worker...')
const worker = createCronWorker()
startWorkerHealthServer(healthPort)

const shutdown = async (signal: string) => {
  console.log(`\n[${signal}] Shutting down cron worker...`)
  await worker.close()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

console.log('Cron Worker started. Waiting for jobs...')
