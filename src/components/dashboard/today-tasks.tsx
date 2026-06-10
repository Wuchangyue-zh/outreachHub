'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Clock, Mail, Phone, Calendar, ArrowRight, ListTodo,
  RefreshCw, AlertCircle,
} from 'lucide-react'

interface TodayTask {
  id: string
  name: string
  type: string
  status: string
  contactName: string | null
  contactEmail: string | null
  followUpScheduledAt: string | null
  followUpReason: string | null
  createdAt: string
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  OUTREACH: { label: '拓客', icon: Mail, color: 'text-blue-600 bg-blue-50' },
  FOLLOW_UP: { label: '跟进', icon: Phone, color: 'text-amber-600 bg-amber-50' },
  NURTURE: { label: '培育', icon: Calendar, color: 'text-emerald-600 bg-emerald-50' },
}

function getDueDateStatus(dateStr: string): 'overdue' | 'today' | 'upcoming' {
  const date = new Date(dateStr)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)

  if (date < todayStart) return 'overdue'
  if (date >= todayStart && date < todayEnd) return 'today'
  return 'upcoming'
}

const DUE_DATE_STYLES: Record<string, { color: string; label: string }> = {
  overdue: { color: 'text-red-600 bg-red-50', label: '已逾期' },
  today: { color: 'text-amber-600 bg-amber-50', label: '今天' },
  upcoming: { color: 'text-gray-500 bg-gray-50', label: '即将' },
}

export default function TodayTasks() {
  const [tasks, setTasks] = useState<TodayTask[]>([])
  const [loading, setLoading] = useState(true)
  const [overdueCount, setOverdueCount] = useState(0)

  useEffect(() => {
    fetchTodayTasks()
  }, [])

  async function fetchTodayTasks() {
    setLoading(true)
    try {
      const res = await fetch('/api/tasks?status=PENDING&limit=10')
      const data = await res.json()
      if (data.success) {
        const allTasks: TodayTask[] = data.data
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const todayEnd = new Date(todayStart)
        todayEnd.setDate(todayEnd.getDate() + 1)

        const overdue = allTasks.filter(t => {
          if (!t.followUpScheduledAt) return false
          return new Date(t.followUpScheduledAt) < todayStart
        })
        setOverdueCount(overdue.length)

        // Sort: overdue first, then today, then upcoming
        const sorted = [...allTasks].sort((a, b) => {
          const aDate = a.followUpScheduledAt
          const bDate = b.followUpScheduledAt
          if (!aDate && !bDate) return 0
          if (!aDate) return 1
          if (!bDate) return -1
          return new Date(aDate).getTime() - new Date(bDate).getTime()
        })

        setTasks(sorted.slice(0, 5))
      }
    } catch (e) {
      console.error('Failed to fetch today tasks:', e)
    } finally {
      setLoading(false)
    }
  }

  const totalPending = tasks.length

  return (
    <Card className="border-gray-100">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">今日待办</CardTitle>
          {totalPending > 0 && (
            <Badge className="bg-primary/10 text-primary border-0 text-xs">
              {totalPending}
            </Badge>
          )}
          {overdueCount > 0 && (
            <Badge className="bg-red-100 text-red-700 border-0 text-xs gap-1">
              <AlertCircle className="h-3 w-3" />
              {overdueCount} 逾期
            </Badge>
          )}
        </div>
        <Link
          href="/dashboard/tasks"
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          查看全部
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 加载中...
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ListTodo className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 font-medium">暂无待办任务</p>
            <p className="text-xs text-gray-400 mt-1">所有任务已完成，太棒了！</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const typeCfg = TYPE_CONFIG[task.type] || TYPE_CONFIG.OUTREACH
              const TypeIcon = typeCfg.icon
              const dueDate = task.followUpScheduledAt
                ? getDueDateStatus(task.followUpScheduledAt)
                : null
              const dueStyle = dueDate ? DUE_DATE_STYLES[dueDate] : null

              return (
                <Link
                  key={task.id}
                  href="/dashboard/tasks"
                  className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${typeCfg.color}`}>
                    <TypeIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {task.name}
                    </p>
                    {task.contactName && (
                      <p className="text-xs text-gray-500 truncate">
                        {task.contactName}
                        {task.contactEmail && ` · ${task.contactEmail}`}
                      </p>
                    )}
                  </div>
                  {dueStyle && (
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${dueStyle.color}`}>
                      {dueStyle.label}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
