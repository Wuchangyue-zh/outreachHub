import { createServer } from 'http'
import { getQueueStats } from './email-queue'
import { getCronQueueStats } from './cron-queue'

export function startWorkerHealthServer(port = parseInt(process.env.WORKER_HEALTH_PORT || '8080', 10)) {
  const server = createServer(async (req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      try {
        const [emailQueue, cronQueue] = await Promise.all([
          getQueueStats(),
          getCronQueueStats(),
        ])
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          status: 'ok',
          timestamp: Date.now(),
          emailQueue,
          cronQueue,
        }))
      } catch (err) {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'error', error: String(err) }))
      }
      return
    }

    res.writeHead(404)
    res.end('Not Found')
  })

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(
        `[Worker Health] Port ${port} already in use — health server disabled, worker continues`
      )
      return
    }
    console.error('[Worker Health] Server error:', err)
  })

  server.listen(port, () => {
    console.log(`[Worker Health] Listening on port ${port}`)
  })

  return server
}
