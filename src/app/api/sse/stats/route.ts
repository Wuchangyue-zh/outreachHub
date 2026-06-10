import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, tenantWhere } from '@/lib/auth-middleware'
import { emailEvents, type EmailEvent } from '@/lib/events'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuthToken(req)
    if (!authResult.success) {
      return new Response('Unauthorized', { status: 401 })
    }

    const tenantId = authResult.tenantId

    const encoder = new TextEncoder()
    let interval: ReturnType<typeof setInterval> | null = null
    let unsubscribe: (() => void) | null = null
    let closed = false

    const cleanup = () => {
      if (closed) return
      closed = true
      if (interval) {
        clearInterval(interval)
        interval = null
      }
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
    }

    const stream = new ReadableStream({
      start(controller) {
        const safeEnqueue = (data: string) => {
          if (closed || controller.desiredSize === null) return false
          try {
            controller.enqueue(encoder.encode(data))
            return true
          } catch {
            cleanup()
            return false
          }
        }

        // Send initial connection message
        safeEnqueue(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`)

        // Listen for real-time email events
        unsubscribe = emailEvents.on('*' as any, (event: EmailEvent) => {
          if (closed) return
          if (tenantId && event.tenantId && event.tenantId !== tenantId) return
          const { type: eventType, ...rest } = event
          safeEnqueue(`data: ${JSON.stringify({ type: 'email_event', eventType, ...rest })}\n\n`)
        })

        // Poll for new data every 5 seconds
        interval = setInterval(async () => {
          if (closed) return

          try {
            const tenantFilter = tenantId ? { campaign: { tenantId } } : {}
            const [contactsCount, campaignsCount, emailLogsCount] = await Promise.all([
              prisma.contact.count({ where: tenantWhere(tenantId) }),
              prisma.campaign.count({ where: tenantWhere(tenantId) }),
              prisma.emailLog.count({ where: tenantFilter }),
            ])

            const recentEmailLogs = await prisma.emailLog.findMany({
              where: tenantFilter,
              take: 10,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                status: true,
                toEmail: true,
                subject: true,
                sentAt: true,
                openedAt: true,
                repliedAt: true,
                replyCategory: true,
              },
            })

            // Get recent email events
            const recentEvents = emailEvents.getRecentEvents(5)

            const stats = {
              type: 'stats',
              timestamp: Date.now(),
              data: {
                contactsCount,
                campaignsCount,
                emailLogsCount,
                recentEmailLogs,
                recentEvents,
              },
            }

            safeEnqueue(`data: ${JSON.stringify(stats)}\n\n`)
          } catch (error) {
            if (!closed) {
              console.error('[SSE] Error fetching stats:', error)
            }
          }
        }, 5000)

        req.signal.addEventListener('abort', cleanup, { once: true })
        if (req.signal.aborted) cleanup()
      },
      cancel() {
        cleanup()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[SSE] Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
