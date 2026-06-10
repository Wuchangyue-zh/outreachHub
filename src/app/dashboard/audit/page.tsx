'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { useI18n } from '@/hooks/use-i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

interface AuditLogEntry {
  id: string
  userId: string
  action: string
  resource: string | null
  resourceId: string | null
  ip: string | null
  meta: Record<string, unknown> | null
  createdAt: string
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  login: { label: '登录', color: 'bg-green-100 text-green-700' },
  login_2fa: { label: '2FA 登录', color: 'bg-green-100 text-green-700' },
  logout: { label: '登出', color: 'bg-gray-100 text-gray-700' },
  enable_2fa: { label: '启用 2FA', color: 'bg-blue-100 text-blue-700' },
  disable_2fa: { label: '禁用 2FA', color: 'bg-orange-100 text-orange-700' },
  launch_campaign: { label: '启动活动', color: 'bg-purple-100 text-purple-700' },
  delete_contact: { label: '删除联系人', color: 'bg-red-100 text-red-700' },
  delete_campaign: { label: '删除活动', color: 'bg-red-100 text-red-700' },
  create_deal: { label: '创建商机', color: 'bg-blue-100 text-blue-700' },
  update_deal: { label: '更新商机', color: 'bg-blue-100 text-blue-700' },
  claim_contact: { label: '领取客户', color: 'bg-teal-100 text-teal-700' },
  release_contact: { label: '释放客户', color: 'bg-orange-100 text-orange-700' },
  export_data: { label: '导出数据', color: 'bg-yellow-100 text-yellow-700' },
  change_plan: { label: '变更套餐', color: 'bg-indigo-100 text-indigo-700' },
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [actionFilter, setActionFilter] = useState('')
  const limit = 20

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (actionFilter) params.set('action', actionFilter)
      const res = await fetch(`/api/audit?${params}`)
      const data = await res.json()
      if (data.success) {
        setLogs(data.data)
        setTotal(data.pagination?.total || 0)
      }
    } catch {
      // silent — toast not available without sonner
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / limit)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('audit.title')}</h1>
            <p className="text-sm text-gray-500">{t('audit.totalRecords').replace('{total}', String(total))}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="mr-2 h-4 w-4" />{t('audit.refresh')}
          </Button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={actionFilter === '' ? 'default' : 'outline'} onClick={() => { setActionFilter(''); setPage(1) }}>{t('audit.all')}
          {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
            <Button key={key} size="sm" variant={actionFilter === key ? 'default' : 'outline'} onClick={() => { setActionFilter(key); setPage(1) }}>{label}</Button>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-gray-500">{t('audit.noRecords')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">{t('audit.time')}</th>
                      <th className="px-4 py-3 text-left font-medium">{t('audit.action')}</th>
                      <th className="px-4 py-3 text-left font-medium">{t('audit.resource')}</th>
                      <th className="px-4 py-3 text-left font-medium">IP</th>
                      <th className="px-4 py-3 text-left font-medium">{t('audit.details')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700' }
                      return (
                        <tr key={log.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 text-gray-500">{new Date(log.createdAt).toLocaleString('zh-CN')}</td>
                          <td className="px-4 py-3"><Badge className={actionInfo.color}>{actionInfo.label}</Badge></td>
                          <td className="px-4 py-3">{log.resource}{log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ''}</td>
                          <td className="px-4 py-3 font-mono text-xs">{log.ip || '-'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{log.meta ? JSON.stringify(log.meta) : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{t('audit.pageInfo').replace('{page}', String(page)).replace('{totalPages}', String(totalPages))}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
