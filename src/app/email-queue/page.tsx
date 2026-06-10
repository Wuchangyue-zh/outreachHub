'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Mail, Clock, CheckCircle, XCircle, Play, Trash2, RefreshCw,
  AlertTriangle, BarChart3, Loader2
} from 'lucide-react'

interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  queueAvailable: boolean
  failedJobs?: FailedJob[]
}

interface FailedJob {
  id: string | null
  name: string
  data: { to: string; subject: string; campaignId?: string }
  failedReason: string | null
  attemptsMade: number
  timestamp: number
  processedOn: number | null
  finishedOn: number | null
}

interface EmailJob {
  id: string | null
  name: string
  state: string
  progress: number
  returnValue: any
  failedReason: string | null
  timestamp: number
  processedOn: number | null
  finishedOn: number | null
  attemptsMade: number
}

export default function EmailQueuePage() {
  const { t } = useI18n()
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [recentJobs, setRecentJobs] = useState<EmailJob[]>([])
  const [failedJobs, setFailedJobs] = useState<EmailJob[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [cleaning, setCleaning] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    setLoading(true)
    try {
      const res = await fetch('/api/email-queue')
      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (e) {
      console.error('Failed to fetch queue stats:', e)
    } finally {
      setLoading(false)
    }
  }

  async function retryFailedJobs() {
    setRetrying(true)
    try {
      const res = await fetch('/api/email-queue/retry', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        await fetchStats()
      }
    } catch (e) {
      console.error('Failed to retry jobs:', e)
    } finally {
      setRetrying(false)
    }
  }

  async function cleanOldJobs() {
    setCleaning(true)
    try {
      const res = await fetch('/api/email-queue/clean', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        await fetchStats()
      }
    } catch (e) {
      console.error('Failed to clean jobs:', e)
    } finally {
      setCleaning(false)
    }
  }

  const stateColors: Record<string, string> = {
    waiting: 'bg-yellow-100 text-yellow-700',
    active: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    delayed: 'bg-purple-100 text-purple-700',
  }

  const stateLabels: Record<string, string> = {
    waiting: t('emailQueue.state.waiting'),
    active: t('emailQueue.state.active'),
    completed: t('emailQueue.state.completed'),
    failed: t('emailQueue.state.failed'),
    delayed: t('emailQueue.state.delayed'),
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('emailQueue.title')}</h1>
            <p className="text-sm text-gray-500">{t('emailQueue.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchStats}>
              <RefreshCw className="h-4 w-4 mr-2" /> {t('common.refresh')}
            </Button>
            <Button variant="outline" size="sm" onClick={retryFailedJobs} disabled={retrying || !stats?.failed}>
              {retrying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              {t('emailQueue.retryFailed')}
            </Button>
            <Button variant="outline" size="sm" onClick={cleanOldJobs} disabled={cleaning}>
              {cleaning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {t('emailQueue.cleanOld')}
            </Button>
          </div>
        </div>

        {/* 失败任务警告横幅 */}
        {stats && stats.failed > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-red-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-red-800">
                    有 {stats.failed} 个邮件发送失败
                  </h3>
                  <p className="text-sm text-red-600 mt-1">
                    系统每 30 分钟会自动重试最近 1 小时内失败的任务（最多 20 条）；也可点击下方按钮立即全部重试。
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={retryFailedJobs}
                disabled={retrying}
                className="flex-shrink-0"
              >
                {retrying ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                立即重试
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="border-gray-100">
                <CardContent className="p-6">
                  <div className="h-20 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-yellow-50 p-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.waiting}</p>
                      <p className="text-xs text-gray-500">{t('emailQueue.state.waiting')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-50 p-2">
                      <Play className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.active}</p>
                      <p className="text-xs text-gray-500">{t('emailQueue.state.active')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-50 p-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.completed}</p>
                      <p className="text-xs text-gray-500">{t('emailQueue.state.completed')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`border-gray-100 ${stats.failed > 0 ? 'border-red-300 bg-red-50/50 ring-1 ring-red-200' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${stats.failed > 0 ? 'bg-red-100' : 'bg-red-50'}`}>
                      <XCircle className={`h-5 w-5 ${stats.failed > 0 ? 'text-red-700 animate-pulse' : 'text-red-600'}`} />
                    </div>
                    <div>
<<<<<<< HEAD
                      <p className="text-2xl font-bold">{stats.failed}</p>
                      <p className="text-xs text-gray-500">{t('emailQueue.state.failed')}</p>
=======
                      <p className={`text-2xl font-bold ${stats.failed > 0 ? 'text-red-700' : ''}`}>{stats.failed}</p>
                      <p className={`text-xs ${stats.failed > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        失败 {stats.failed > 0 && '⚠️ 需处理'}
                      </p>
>>>>>>> feat/landing-page
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-50 p-2">
                      <Mail className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.delayed}</p>
                      <p className="text-xs text-gray-500">{t('emailQueue.state.delayed')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Queue Status */}
            <Card className="border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t('emailQueue.queueStatus')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Badge className={stats.queueAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {stats.queueAvailable ? t('emailQueue.available') : t('emailQueue.unavailable')}
                  </Badge>
                  {!stats.queueAvailable && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">{t('emailQueue.redisUnavailable')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* I5: Failed Jobs Detail */}
            {stats.failedJobs && stats.failedJobs.length > 0 && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <XCircle className="h-5 w-5" />
                    失败任务详情（{stats.failedJobs.length}）
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-red-100">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">任务ID</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">收件人</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">主题</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">失败原因</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">重试次数</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.failedJobs.map((job, idx) => (
                          <tr key={job.id || idx} className="border-b border-red-50">
                            <td className="px-3 py-2 font-mono text-xs">{job.id?.slice(0, 12)}</td>
                            <td className="px-3 py-2 text-xs">{job.data?.to || '-'}</td>
                            <td className="px-3 py-2 text-xs max-w-[200px] truncate">{job.data?.subject || '-'}</td>
                            <td className="px-3 py-2 text-xs text-red-600 max-w-[250px] truncate" title={job.failedReason || ''}>
                              {job.failedReason || '未知错误'}
                            </td>
                            <td className="px-3 py-2 text-xs">{job.attemptsMade}</td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                              {new Date(job.timestamp).toLocaleString('zh-CN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Jobs */}
            <Card className="border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  {t('emailQueue.recentJobs')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentJobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p>{t('emailQueue.noJobs')}</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">{t('emailQueue.tableHeaders.id')}</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">{t('emailQueue.tableHeaders.status')}</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">{t('emailQueue.tableHeaders.progress')}</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">{t('emailQueue.tableHeaders.retries')}</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">{t('emailQueue.tableHeaders.time')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentJobs.slice(0, 10).map((job) => (
                        <tr key={job.id} className="border-b border-gray-50">
                          <td className="px-4 py-3 font-mono text-xs">{job.id?.slice(0, 12)}...</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${stateColors[job.state] || 'bg-gray-100'}`}>
                              {stateLabels[job.state] || job.state}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{job.progress}%</span>
                          </td>
                          <td className="px-4 py-3">{job.attemptsMade}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {new Date(job.timestamp).toLocaleString('zh-CN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-gray-100">
            <CardContent className="py-12 text-center text-gray-400">
              <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p>{t('emailQueue.fetchError')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
