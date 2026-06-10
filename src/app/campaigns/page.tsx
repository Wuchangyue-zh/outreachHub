'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
<<<<<<< HEAD
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/hooks/use-i18n'
import { CampaignStats } from '@/components/CampaignStats'
import { ABTestConfig } from '@/components/ABTestConfig'
=======
>>>>>>> feat/landing-page
import {
  Send, Plus, TrendingUp, TrendingDown, Eye, Reply, Rocket,
  Search, Pause, Play, Trash2, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CampaignStats } from '@/components/CampaignStats'

// ─── Types ──────────────────────────────────────────────────

type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED'
type StatusFilter = 'all' | CampaignStatus

interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  type: string
  totalSent: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  totalBounced: number
  contactIds: string[]
  _count?: { campaignContacts: number }
  createdAt: string
  sentAt: string | null
  completedAt: string | null
  product?: { id: string; name: string } | null
}

interface CampaignsStats {
  overall: {
    totalSent: number
    totalOpened: number
    totalClicked: number
    totalReplied: number
    totalBounced: number
    openRate: number
    clickRate: number
    replyRate: number
    bounceRate: number
  }
  daily: Array<{ date: string; sent: number; opened: number; clicked: number; replied: number }>
  comparison: Array<{ name: string; openRate: number; clickRate: number; replyRate: number }>
}

// Map DB status to display config
const STATUS_DISPLAY: Record<CampaignStatus, { label: string; dot: string; bg: string; text: string }> = {
  RUNNING:   { label: 'Running',   dot: 'bg-green-500 animate-pulse', bg: 'bg-green-50',   text: 'text-green-700' },
  PAUSED:    { label: 'Paused',    dot: 'bg-amber-500',              bg: 'bg-amber-50',    text: 'text-amber-700' },
  DRAFT:     { label: 'Draft',     dot: 'bg-blue-500',               bg: 'bg-blue-50',     text: 'text-blue-700' },
  COMPLETED: { label: 'Completed', dot: 'bg-gray-400',               bg: 'bg-gray-100',    text: 'text-gray-600' },
  SCHEDULED: { label: 'Scheduled', dot: 'bg-purple-500',             bg: 'bg-purple-50',   text: 'text-purple-700' },
  FAILED:    { label: 'Failed',    dot: 'bg-red-500',                bg: 'bg-red-50',      text: 'text-red-700' },
}

function rateDenominator(c: Campaign): number {
  // Use totalSent from the campaign model (server-side counter)
  return c.totalSent || 0
}

// ─── Stat Card ──────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  iconBg,
}: {
  icon: React.ElementType
  label: string
  value: string
  delta?: number
  iconBg: string
}) {
  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', iconBg)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {delta !== undefined && (
            <span
              className={cn(
                'flex items-center gap-0.5 text-xs font-semibold',
                delta >= 0 ? 'text-emerald-600' : 'text-red-500',
              )}
            >
              {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {delta >= 0 ? '+' : ''}{delta}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Rate Bar ───────────────────────────────────────────────

function RateBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-sm tabular-nums text-gray-700">{value > 0 ? `${value.toFixed(1)}%` : '—'}</span>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────

export default function CampaignsPage() {
<<<<<<< HEAD
  const { addToast } = useToast()
  const { t } = useI18n()
=======
>>>>>>> feat/landing-page
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<CampaignsStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [actioning, setActioning] = useState<string | null>(null)

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      const [campRes, statsRes] = await Promise.all([
        fetch('/api/campaigns?page=1&limit=100'),
        fetch('/api/campaigns/stats'),
      ])
      const campJson = await campRes.json()
      const statsJson = await statsRes.json()
      if (campJson.success) setCampaigns(campJson.data)
      if (statsJson.success) setStats(statsJson.data)
    } catch (e) {
<<<<<<< HEAD
      console.error(e)
      addToast({ type: 'error', title: t('common.loadFailed') })
=======
      console.error('Failed to fetch campaigns:', e)
>>>>>>> feat/landing-page
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [campaigns, search, statusFilter])

<<<<<<< HEAD
  const handleSave = async () => {
    if (!form.name || !form.subject || !form.content) {
      addToast({ type: 'error', title: t('common.fillRequired') })
      return
    }

    setSaving(true)
=======
  const toggleCampaign = async (id: string) => {
    const camp = campaigns.find((c) => c.id === id)
    if (!camp) return
    const newStatus: CampaignStatus = camp.status === 'RUNNING' ? 'PAUSED' : 'RUNNING'
    setActioning(id)
>>>>>>> feat/landing-page
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
<<<<<<< HEAD

      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', title: currentCampaign ? t('campaigns.updateSuccess') : t('campaigns.createSuccess') })
        setShowDialog(false)
        fetchCampaigns()
      } else {
        addToast({ type: 'error', title: t('common.operationFailed'), description: data.error })
=======
      const json = await res.json()
      if (!res.ok || !json.success) {
        alert(json.message || '操作失败')
        return
>>>>>>> feat/landing-page
      }
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      )
    } catch (e) {
<<<<<<< HEAD
      addToast({ type: 'error', title: t('common.operationFailed') })
=======
      console.error('Failed to toggle campaign:', e)
      alert('操作失败，请重试')
>>>>>>> feat/landing-page
    } finally {
      setActioning(null)
    }
  }

<<<<<<< HEAD
  const handleDelete = async (id: string) => {
    if (!confirm(t('campaigns.confirmDelete'))) return

    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', title: t('common.deleteSuccess') })
        fetchCampaigns()
      }
    } catch (e) {
      addToast({ type: 'error', title: t('common.deleteFailed') })
=======
  const deleteCampaign = async (id: string) => {
    if (!confirm('确定要删除这个营销活动吗？此操作不可撤销。')) return
    setActioning(id)
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || !json.success) {
        alert(json.message || '删除失败')
        return
      }
      setCampaigns((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      console.error('Failed to delete campaign:', e)
      alert('删除失败，请重试')
    } finally {
      setActioning(null)
    }
  }

  const launchCampaign = async (id: string) => {
    if (!confirm('确定要启动这个营销活动吗？系统将开始向目标联系人发送邮件。')) return
    setActioning(id)
    try {
      const res = await fetch(`/api/campaigns/${id}/launch`, { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        await fetchCampaigns()
      } else {
        alert(json.message || '启动失败')
      }
    } catch (e) {
      console.error('Failed to launch campaign:', e)
      alert('启动失败，请重试')
    } finally {
      setActioning(null)
>>>>>>> feat/landing-page
    }
  }

  const overall = stats?.overall
  const statsValue = {
    totalSent: overall?.totalSent ?? 0,
    avgOpenRate: overall ? overall.openRate : 0,
    avgReplyRate: overall ? overall.replyRate : 0,
    activeCampaigns: campaigns.filter((c) => c.status === 'RUNNING').length,
  }

<<<<<<< HEAD
  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: t('campaigns.status.draft'),
      SCHEDULED: t('campaigns.status.scheduled'),
      RUNNING: t('campaigns.status.running'),
      PAUSED: t('campaigns.status.paused'),
      COMPLETED: t('campaigns.status.completed'),
      FAILED: t('campaigns.status.failed'),
    }
    return map[status] || status
  }

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      SINGLE: t('campaigns.type.single'),
      SEQUENCE: t('campaigns.type.sequence'),
      AB_TEST: t('campaigns.type.abTest'),
    }
    return map[type] || type
  }

  const stats = {
    running: campaigns.filter(c => c.status === 'RUNNING').length,
    totalSent: campaigns.reduce((sum, c) => sum + c.totalSent, 0),
    avgOpenRate: campaigns.length > 0
      ? (campaigns.reduce((sum, c) => sum + (c.totalSent > 0 ? c.totalOpened / c.totalSent : 0), 0) / campaigns.length * 100).toFixed(1)
      : '0',
=======
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-32">
          <p className="text-gray-500">加载中...</p>
        </div>
      </DashboardLayout>
    )
>>>>>>> feat/landing-page
  }

  return (
    <DashboardLayout>
<<<<<<< HEAD
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('campaigns.title')}</h1>
            <p className="text-sm text-gray-500">{t('campaigns.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="gap-2 rounded-none"
              >
                <List className="h-4 w-4" /> {t('campaigns.listView')}
              </Button>
              <Button
                variant={viewMode === 'stats' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('stats')}
                className="gap-2 rounded-none"
              >
                <BarChart3 className="h-4 w-4" /> {t('campaigns.statsView')}
              </Button>
              <Button
                variant={viewMode === 'abtest' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('abtest')}
                className="gap-2 rounded-none"
              >
                <Beaker className="h-4 w-4" /> {t('campaigns.abTestView')}
              </Button>
            </div>
            <Button className="gap-2" onClick={openAddDialog}>
              <Plus className="h-4 w-4" /> {t('campaigns.createCampaign')}
            </Button>
          </div>
=======
      <div className="space-y-6 py-6">
        {/* ─── Top Stats Grid ─── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Send}
            label="Total Sent"
            value={statsValue.totalSent.toLocaleString()}
            iconBg="bg-blue-50 text-blue-600"
          />
          <StatCard
            icon={Eye}
            label="Avg Open Rate"
            value={`${statsValue.avgOpenRate.toFixed(1)}%`}
            iconBg="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={Reply}
            label="Avg Reply Rate"
            value={`${statsValue.avgReplyRate.toFixed(1)}%`}
            iconBg="bg-violet-50 text-violet-600"
          />
          <StatCard
            icon={Rocket}
            label="Active Campaigns"
            value={String(statsValue.activeCampaigns)}
            iconBg="bg-amber-50 text-amber-600"
          />
>>>>>>> feat/landing-page
        </div>

        <CampaignStats />

<<<<<<< HEAD
        {/* A/B Test View */}
        {viewMode === 'abtest' && (
          <ABTestConfig campaignId={selectedCampaignId} />
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <>
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-50 p-2">
                      <Play className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.running}</p>
                      <p className="text-xs text-gray-500">{t('campaigns.runningCampaigns')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-50 p-2">
                      <Send className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{t('campaigns.totalSent')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-50 p-2">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.avgOpenRate}%</p>
                      <p className="text-xs text-gray-500">{t('campaigns.avgOpenRate')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Campaigns List */}
            <Card className="border-gray-100">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">{t('campaigns.tableHeaders.name')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">{t('campaigns.tableHeaders.type')}</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">{t('campaigns.tableHeaders.status')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">{t('campaigns.tableHeaders.sent')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">{t('campaigns.tableHeaders.openRate')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">{t('campaigns.tableHeaders.replyRate')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">{t('campaigns.tableHeaders.createdAt')}</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-4 py-3"><div className="h-4 w-40 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse ml-auto" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse ml-auto" /></td>
                    </tr>
                  ))
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <Mail className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-gray-500 font-medium">{t('campaigns.noData')}</p>
                      <p className="text-sm text-gray-400 mt-1">{t('campaigns.noDataHint')}</p>
                      <Button className="mt-4 gap-2" onClick={openAddDialog}>
                        <Plus className="h-4 w-4" /> {t('campaigns.createCampaign')}
                      </Button>
                    </td>
                  </tr>
                ) : (
                  campaigns.map((campaign) => {
                    const openRate = campaign.totalSent > 0 ? ((campaign.totalOpened / campaign.totalSent) * 100).toFixed(1) : '-'
                    const replyRate = campaign.totalSent > 0 ? ((campaign.totalReplied / campaign.totalSent) * 100).toFixed(1) : '-'
                    return (
                      <tr key={campaign.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{campaign.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[300px]">{campaign.subject}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {getTypeLabel(campaign.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(campaign.status)}`}>
                            {getStatusLabel(campaign.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{campaign.totalSent.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{openRate}%</td>
                        <td className="px-4 py-3 text-right text-gray-600">{replyRate}%</td>
                        <td className="px-4 py-3 text-right text-gray-500 text-xs">
                          {new Date(campaign.createdAt).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelectedCampaignId(campaign.id)
                                setViewMode('stats')
                              }}
                              title={t('campaigns.viewStats')}
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(campaign)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(campaign.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {total > 10 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-gray-500">{t('campaigns.totalCount').replace('{n}', total.toString())}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    {t('common.prevPage')}
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(p => p + 1)}>
                    {t('common.nextPage')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          </>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{currentCampaign ? t('campaigns.editCampaign') : t('campaigns.createCampaign')}</h2>
              <button onClick={() => setShowDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>{t('campaigns.form.name')} *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('campaigns.form.namePlaceholder')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('campaigns.form.type')}</Label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="SINGLE">{t('campaigns.type.single')}</option>
                    <option value="SEQUENCE">{t('campaigns.type.sequence')}</option>
                    <option value="AB_TEST">{t('campaigns.type.abTest')}</option>
                  </select>
                </div>
                <div>
                  <Label>{t('campaigns.form.scheduleType')}</Label>
                  <select
                    value={form.scheduleType}
                    onChange={(e) => setForm({ ...form, scheduleType: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="IMMEDIATE">{t('campaigns.schedule.immediate')}</option>
                    <option value="SCHEDULED">{t('campaigns.schedule.scheduled')}</option>
                  </select>
                </div>
              </div>
              {form.scheduleType === 'SCHEDULED' && (
                <div>
                  <Label>{t('campaigns.form.scheduledAt')}</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  />
                </div>
              )}
              <div>
                <Label>{t('campaigns.form.subject')} *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder={t('campaigns.form.subjectPlaceholder')}
                />
              </div>
              <div>
                <Label>{t('campaigns.form.content')} *</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder={t('campaigns.form.contentPlaceholder')}
                  rows={10}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {currentCampaign ? t('common.save') : t('campaigns.createCampaign')}
              </Button>
            </div>
          </div>
=======
        {/* ─── Filter & Actions Bar ─── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            {/* Search */}
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="搜索任务名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="RUNNING">Running</option>
              <option value="PAUSED">Paused</option>
              <option value="DRAFT">Draft</option>
              <option value="COMPLETED">Completed</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* New Campaign button */}
          <Link href="/campaigns/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>

        {/* ─── Campaigns Table ─── */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Campaign Name
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Audience
                </th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Sent
                </th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Open Rate
                </th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Reply Rate
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Created
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((campaign) => {
                const cfg = STATUS_DISPLAY[campaign.status]
                const den = rateDenominator(campaign)
                const openRate = den > 0 ? (campaign.totalOpened / den) * 100 : 0
                const replyRate = den > 0 ? (campaign.totalReplied / den) * 100 : 0

                return (
                  <tr
                    key={campaign.id}
                    className="transition-colors hover:bg-gray-50/50"
                  >
                    {/* Name + created */}
                    <td className="px-5 py-4">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="font-semibold text-gray-900 hover:text-violet-600 hover:underline"
                      >
                        {campaign.name}
                      </Link>
                      {campaign.product && (
                        <p className="mt-0.5 text-xs text-blue-600">📦 {campaign.product.name}</p>
                      )}
                      <p className="mt-0.5 text-xs text-gray-400">
                        {new Date(campaign.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                          cfg.bg, cfg.text,
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                        {cfg.label}
                      </span>
                    </td>

                    {/* Audience */}
                    <td className="px-5 py-4 text-right tabular-nums text-gray-700">
                      {(campaign._count?.campaignContacts ?? campaign.contactIds?.length ?? 0).toLocaleString()}
                    </td>

                    {/* Sent */}
                    <td className="px-5 py-4 text-right tabular-nums text-gray-700">
                      {campaign.totalSent.toLocaleString()}
                    </td>

                    {/* Open rate */}
                    <td className="px-5 py-4 text-center">
                      <RateBar value={openRate} color="bg-emerald-500" />
                    </td>

                    {/* Reply rate */}
                    <td className="px-5 py-4 text-center">
                      <RateBar value={replyRate} color="bg-violet-500" />
                    </td>

                    {/* Created */}
                    <td className="px-5 py-4 text-right text-xs text-gray-500">
                      {campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString('zh-CN') : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        {campaign.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-violet-600 hover:text-violet-700"
                            onClick={() => launchCampaign(campaign.id)}
                            disabled={actioning === campaign.id}
                            title="启动"
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                        )}
                        {campaign.status === 'PAUSED' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-violet-600 hover:text-violet-700"
                            onClick={() => launchCampaign(campaign.id)}
                            disabled={actioning === campaign.id}
                            title="继续发送"
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                        )}
                        {(campaign.status === 'RUNNING' || campaign.status === 'PAUSED') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700"
                            onClick={() => toggleCampaign(campaign.id)}
                            disabled={actioning === campaign.id}
                            title={campaign.status === 'RUNNING' ? '暂停' : '启动'}
                          >
                            {campaign.status === 'RUNNING'
                              ? <Pause className="h-4 w-4" />
                              : <Play className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => deleteCampaign(campaign.id)}
                          disabled={actioning === campaign.id}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <p className="text-gray-500">没有匹配的营销任务</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
>>>>>>> feat/landing-page
        </div>
      </div>
    </DashboardLayout>
  )
}
