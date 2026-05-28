import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { emailEvents, type EmailEvent } from '@/lib/events'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuthToken(req)
    if (!authResult.success) {
      return new Response('Unauthorized', { status: 401 })
    }

    const encoder = new TextEncoder()
    let disconnected = false

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`))

        // Listen for real-time email events
        const unsubscribe = emailEvents.on('*' as any, (event: EmailEvent) => {
          if (disconnected) return
          try {
            const { type: eventType, ...rest } = event
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'email_event', eventType, ...rest })}\n\n`))
          } catch (e) {
            // Stream might be closed
          }
        })

        // Poll for new data every 5 seconds
        const interval = setInterval(async () => {
          if (disconnected) {
            clearInterval(interval)
            return
          }

          try {
            const [contactsCount, campaignsCount, emailLogsCount] = await Promise.all([
              prisma.contact.count(),
              prisma.campaign.count(),
              prisma.emailLog.count(),
            ])

            const recentEmailLogs = await prisma.emailLog.findMany({
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

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(stats)}\n\n`))
          } catch (error) {
            console.error('[SSE] Error fetching stats:', error)
          }
        }, 5000)

        // Cleanup on disconnect
        return () => {
          disconnected = true
          clearInterval(interval)
          unsubscribe()
        }
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
