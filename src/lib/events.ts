export type EmailEventType = 'email:sent' | 'email:opened' | 'email:clicked' | 'email:replied' | 'email:bounced' | 'email:failed'

export interface EmailEvent {
  type: EmailEventType
  emailLogId: string
  toEmail: string
  subject: string
  campaignId?: string
  contactId?: string
  timestamp: number
  metadata?: Record<string, any>
}

type EventHandler = (event: EmailEvent) => void

class EmailEventEmitter {
  private handlers: Map<EmailEventType, Set<EventHandler>> = new Map()
  private recentEvents: EmailEvent[] = []
  private maxRecentEvents = 50

  on(type: EmailEventType, handler: EventHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)

    return () => {
      this.handlers.get(type)?.delete(handler)
    }
  }

  emit(event: EmailEvent) {
    this.recentEvents.unshift(event)
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents = this.recentEvents.slice(0, this.maxRecentEvents)
    }

    const handlers = this.handlers.get(event.type)
    if (handlers) {
      handlers.forEach(handler => handler(event))
    }

    // Also emit to wildcard listeners
    const wildcardHandlers = this.handlers.get('*' as EmailEventType)
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => handler(event))
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
