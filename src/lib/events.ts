export type EmailEventType = 'email:sent' | 'email:opened' | 'email:clicked' | 'email:replied' | 'email:bounced' | 'email:failed'

export interface EmailEvent {
  type: EmailEventType
  emailLogId: string
  toEmail: string
  subject: string
  campaignId?: string
  contactId?: string
  tenantId?: string
  timestamp: number
  metadata?: Record<string, unknown>
}

type EventHandler = (event: EmailEvent) => void

const REDIS_CHANNEL = 'outreachhub:email-events'

class EmailEventEmitter {
  private handlers: Map<EmailEventType | '*', Set<EventHandler>> = new Map()
  private recentEvents: EmailEvent[] = []
  private maxRecentEvents = 50
  private subscriberStarted = false

  on(type: EmailEventType | '*', handler: EventHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
    void this.ensureRedisSubscriber()
    return () => {
      this.handlers.get(type)?.delete(handler)
    }
  }

  private async ensureRedisSubscriber() {
    if (this.subscriberStarted || !process.env.REDIS_URL) return
    this.subscriberStarted = true

    try {
      const Redis = (await import('ioredis')).default
      const sub = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
      await sub.subscribe(REDIS_CHANNEL)
      sub.on('message', (_channel, message) => {
        try {
          const event = JSON.parse(message) as EmailEvent
          this.dispatchLocal(event)
        } catch {
          /* ignore malformed */
        }
      })
    } catch (err) {
      console.warn('[Events] Redis Pub/Sub unavailable, using local-only mode:', err)
      this.subscriberStarted = false
    }
  }

  private dispatchLocal(event: EmailEvent) {
    this.recentEvents.unshift(event)
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents = this.recentEvents.slice(0, this.maxRecentEvents)
    }

    for (const type of [event.type, '*' as const]) {
      const handlers = this.handlers.get(type)
      handlers?.forEach((handler) => handler(event))
    }
  }

  emit(event: EmailEvent) {
    this.dispatchLocal(event)

    if (process.env.REDIS_URL) {
      void (async () => {
        try {
          const { getRedis } = await import('./redis')
          const client = getRedis()
          if (client) {
            await client.publish(REDIS_CHANNEL, JSON.stringify(event))
          }
        } catch {
          /* local-only fallback */
        }
      })()
    }
  }

  getRecentEvents(limit: number = 10): EmailEvent[] {
    return this.recentEvents.slice(0, limit)
  }

  clearRecentEvents() {
    this.recentEvents = []
  }
}

export const emailEvents = new EmailEventEmitter()
