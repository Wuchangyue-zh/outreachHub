'use client'

import { useSSE } from '@/hooks/use-sse'
import { Bell, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'

interface RealtimeData {
  contactsCount: number
  companiesCount: number
  campaignsCount: number
  emailLogsCount: number
  queueStats: {
    waiting: number
    sent: number
    opened: number
    replied: number
    failed: number
  }
  recentEmailLogs: Array<{
    id: string
    status: string
    toEmail: string
    subject: string
    createdAt: string
  }>
}

interface RealtimeStatusProps {
  onNewData?: (data: RealtimeData) => void
}

export function RealtimeStatus({ onNewData }: RealtimeStatusProps) {
  const { data, connected, error } = useSSE('/api/sse/stats', {
    enabled: true,
    reconnectInterval: 10000,
  })

  const [notifications, setNotifications] = useState<string[]>([])

  // Process SSE data
  useEffect(() => {
    if (data?.type === 'stats' && data.data) {
      onNewData?.(data.data)

      // Check for new failed emails
      if (data.data.queueStats?.failed > 0) {
        const msg = `${data.data.queueStats.failed} 封邮件发送失败`
        setNotifications((prev) => {
          if (prev.includes(msg)) return prev
          return [...prev.slice(-4), msg]
        })
      }
    }
  }, [data, onNewData])

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

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="relative">
          <Bell className="h-4 w-4 text-amber-500" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center">
            {notifications.length}
          </span>
        </div>
      )}
    </div>
  )
}
