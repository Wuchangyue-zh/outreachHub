'use client'

import { useSSE } from '@/hooks/use-sse'
import { Bell, Wifi, WifiOff, Loader2, Mail, Eye, MousePointer, Reply, AlertTriangle, X } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/components/ui/toast'

interface EmailEvent {
  type: string
  emailLogId: string
  toEmail: string
  subject: string
  timestamp: number
}

interface RealtimeData {
  contactsCount: number
  campaignsCount: number
  emailLogsCount: number
  recentEmailLogs: Array<{
    id: string
    status: string
    toEmail: string
    subject: string
    sentAt: string | null
    openedAt: string | null
    repliedAt: string | null
    replyCategory: string | null
  }>
  recentEvents: EmailEvent[]
}

interface RealtimeStatusProps {
  onNewData?: (data: RealtimeData) => void
}

const eventIcons: Record<string, typeof Mail> = {
  'email:sent': Mail,
  'email:opened': Eye,
  'email:clicked': MousePointer,
  'email:replied': Reply,
  'email:bounced': AlertTriangle,
  'email:failed': AlertTriangle,
}

const eventLabels: Record<string, string> = {
  'email:sent': '已发送',
  'email:opened': '已打开',
  'email:clicked': '已点击',
  'email:replied': '已回复',
  'email:bounced': '退信',
  'email:failed': '发送失败',
}

const eventColors: Record<string, string> = {
  'email:sent': 'text-blue-600 bg-blue-50',
  'email:opened': 'text-green-600 bg-green-50',
  'email:clicked': 'text-yellow-600 bg-yellow-50',
  'email:replied': 'text-purple-600 bg-purple-50',
  'email:bounced': 'text-red-600 bg-red-50',
  'email:failed': 'text-red-600 bg-red-50',
}

export function RealtimeStatus({ onNewData }: RealtimeStatusProps) {
  const { addToast } = useToast()
  const { data, connected, error } = useSSE('/api/sse/stats', {
    enabled: true,
    reconnectInterval: 10000,
  })

  const [notifications, setNotifications] = useState<EmailEvent[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [lastEventTimestamp, setLastEventTimestamp] = useState(0)

  // Process SSE data
  useEffect(() => {
    if (!data) return

    if (data.type === 'stats' && data.data) {
      onNewData?.(data.data)
    }

    // Process real-time email events
    if (data.type === 'email_event') {
      const event = {
        type: (data as any).eventType || data.type,
        emailLogId: (data as any).emailLogId,
        toEmail: (data as any).toEmail,
        subject: (data as any).subject,
        timestamp: (data as any).timestamp,
      } as EmailEvent
      if (event.timestamp > lastEventTimestamp) {
        setLastEventTimestamp(event.timestamp)
        setNotifications(prev => [event, ...prev].slice(0, 20))

        // Show toast for important events
        if (event.type === 'email:replied') {
          addToast({
            type: 'success',
            title: '收到回复',
            description: `${event.toEmail} 回复了 "${event.subject}"`,
          })
        } else if (event.type === 'email:bounced' || event.type === 'email:failed') {
          addToast({
            type: 'error',
            title: eventLabels[event.type] || '邮件事件',
            description: `${event.toEmail}: ${event.subject}`,
          })
        }
      }
    }
  }, [data, lastEventTimestamp, onNewData, addToast])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return (
    <div className="flex items-center gap-3">
      {/* Connection status */}
      <div className="flex items-center gap-1.5 text-xs">
        {connected ? (
          <>
            <Wifi className="h-3.5 w-3.5 text-green-500" />
            <span className="text-green-600">实时</span>
          </>
        ) : error ? (
          <>
            <WifiOff className="h-3.5 w-3.5 text-red-500" />
            <span className="text-red-500">断开</span>
          </>
        ) : (
          <>
            <Loader2 className="h-3.5 w-3.5 text-gray-400 animate-spin" />
            <span className="text-gray-400">连接中</span>
          </>
        )}
      </div>

      {/* Notifications bell */}
      <div className="relative">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="relative p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Bell className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          {notifications.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-medium">
              {notifications.length > 9 ? '9+' : notifications.length}
            </span>
          )}
        </button>

        {/* Notifications panel */}
        {showPanel && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-medium text-sm">实时通知</h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    清除全部
                  </button>
                )}
                <button
                  onClick={() => setShowPanel(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-72">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  暂无新通知
                </div>
              ) : (
                notifications.map((event, index) => {
                  const Icon = eventIcons[event.type] || Mail
                  const colorClass = eventColors[event.type] || 'text-gray-600 bg-gray-50'
                  return (
                    <div
                      key={`${event.emailLogId}-${event.timestamp}-${index}`}
                      className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {eventLabels[event.type] || event.type}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {event.toEmail}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {event.subject}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {new Date(event.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
