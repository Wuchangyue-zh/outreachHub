'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { useI18n } from '@/hooks/use-i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle,
  User, Mail, Calendar, ListTodo,
} from 'lucide-react'

interface Task {
  id: string
  name: string
  type: string
  status: string
  contactIds: string[]
  totalContacts: number
  completedContacts: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  contactName: string | null
  contactEmail: string | null
  followUpScheduledAt: string | null
  followUpReason: string | null
  originalCampaignId: string | null
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  DRAFT: { label: '草稿', bg: 'bg-gray-100', text: 'text-gray-700', icon: ListTodo },
  PENDING: { label: '待执行', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  RUNNING: { label: '执行中', bg: 'bg-blue-100', text: 'text-blue-700', icon: RefreshCw },
  PAUSED: { label: '已暂停', bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertTriangle },
  COMPLETED: { label: '已完成', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  FAILED: { label: '失败', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
}

const TYPE_LABELS: Record<string, string> = {
  OUTREACH: '拓客',
  FOLLOW_UP: '跟进',
  NURTURE: '培育',
}

export default function TasksPage() {
  const { t } = useI18n()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      const res = await fetch(`/api/tasks?${params}`)
      const data = await res.json()
      if (data.success) setTasks(data.data)
    } catch {
      console.error('Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTasks() }, [statusFilter, typeFilter])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('tasks.title')}</h1>
            <p className="mt-1 text-sm text-gray-500">{t('tasks.subtitle')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchTasks}>
            <RefreshCw className="h-4 w-4 mr-2" /> {t('tasks.refresh')}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">{t('tasks.allStatus')}</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">{t('tasks.allType')}</option>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Task list */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">{t('tasks.loading')}</p>
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ListTodo className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">{t('tasks.noTasks')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('tasks.noTasksHint')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.DRAFT
              const StatusIcon = cfg.icon
              const isFollowUp = task.type === 'FOLLOW_UP'
              const scheduledAt = task.followUpScheduledAt ? new Date(task.followUpScheduledAt) : null
              const isOverdue = scheduledAt && scheduledAt < new Date() && task.status === 'PENDING'

              return (
                <Card key={task.id} className={isOverdue ? 'border-amber-300 bg-amber-50/30' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`mt-0.5 rounded-lg p-2 ${cfg.bg}`}>
                          <StatusIcon className={`h-4 w-4 ${cfg.text}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">{task.name}</p>
                            <Badge className={`${cfg.bg} ${cfg.text} border-0`}>{cfg.label}</Badge>
                            <span className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-600">{TYPE_LABELS[task.type] || task.type}</span>
                          </div>

                          {/* 联系人信息 */}
                          {task.contactName && (
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" /> {task.contactName}
                              </span>
                              {task.contactEmail && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {task.contactEmail}
                                </span>
                              )}
                            </div>
                          )}

                          {/* 跟进信息 */}
                          {isFollowUp && (
                            <div className="flex items-center gap-3 mt-1.5 text-xs">
                              {scheduledAt && (
                                <span className={`flex items-center gap-1 ${isOverdue ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                                  <Calendar className="h-3 w-3" />
                                  {t('tasks.plannedFollowUp')}{scheduledAt.toLocaleDateString('zh-CN')} {scheduledAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                  {isOverdue && ` ${t('tasks.overdue')}`}
                                </span>
                              )}
                              {task.followUpReason && (
                                <span className="text-gray-400">{t('tasks.reason')}{task.followUpReason}</span>
                              )}
                            </div>
                          )}

                          {/* 时间 */}
                          <p className="text-xs text-gray-400 mt-1.5">
                            {t('tasks.createdAt')} {new Date(task.createdAt).toLocaleString('zh-CN')}
                            {task.completedAt && ` · ${t('tasks.completedAt')} ${new Date(task.completedAt).toLocaleString('zh-CN')}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
