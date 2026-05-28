'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { CampaignStats } from '@/components/CampaignStats'
import { ABTestConfig } from '@/components/ABTestConfig'
import {
  Send, Plus, BarChart3, Eye, Edit, Trash2, X, Loader2, Play, Pause, Mail, List, Beaker
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  type: string
  status: string
  subject: string
  content: string
  contactIds: string[]
  scheduleType: string
  scheduledAt: string | null
  totalSent: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  totalBounced: number
  createdAt: string
  sentAt: string | null
}

export default function CampaignsPage() {
  const { addToast } = useToast()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [viewMode, setViewMode] = useState<'list' | 'stats' | 'abtest'>('list')
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>(undefined)

  const [form, setForm] = useState({
    name: '',
    subject: '',
    content: '',
    type: 'SINGLE',
    scheduleType: 'IMMEDIATE',
    scheduledAt: '',
  })

  useEffect(() => {
    fetchCampaigns()
  }, [page])

  async function fetchCampaigns() {
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns?page=${page}&limit=10`)
      const data = await res.json()
      if (data.success) {
        setCampaigns(data.data)
        setTotal(data.pagination.total)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({ name: '', subject: '', content: '', type: 'SINGLE', scheduleType: 'IMMEDIATE', scheduledAt: '' })
  }

  const openAddDialog = () => {
    resetForm()
    setCurrentCampaign(null)
    setShowDialog(true)
  }

  const openEditDialog = (campaign: Campaign) => {
    setCurrentCampaign(campaign)
    setForm({
      name: campaign.name,
      subject: campaign.subject,
      content: campaign.content,
      type: campaign.type,
      scheduleType: campaign.scheduleType,
      scheduledAt: campaign.scheduledAt || '',
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.content) {
      addToast({ type: 'error', title: '请填写必填项' })
      return
    }

    setSaving(true)
    try {
      const url = currentCampaign ? `/api/campaigns/${currentCampaign.id}` : '/api/campaigns'
      const method = currentCampaign ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', title: currentCampaign ? '更新成功' : '创建成功' })
        setShowDialog(false)
        fetchCampaigns()
      } else {
        addToast({ type: 'error', title: '操作失败', description: data.error })
      }
    } catch (e) {
      addToast({ type: 'error', title: '操作失败' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此活动吗？')) return

    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', title: '删除成功' })
        fetchCampaigns()
      }
    } catch (e) {
      addToast({ type: 'error', title: '删除失败' })
    }
  }

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      SCHEDULED: 'bg-yellow-100 text-yellow-700',
      RUNNING: 'bg-green-100 text-green-700',
      PAUSED: 'bg-orange-100 text-orange-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      FAILED: 'bg-red-100 text-red-700',
    }
    return map[status] || 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: '草稿',
      SCHEDULED: '已排期',
      RUNNING: '进行中',
      PAUSED: '已暂停',
      COMPLETED: '已完成',
      FAILED: '失败',
    }
    return map[status] || status
  }

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      SINGLE: '单次发送',
      SEQUENCE: '序列邮件',
      AB_TEST: 'A/B测试',
    }
    return map[type] || type
  }

  const stats = {
    running: campaigns.filter(c => c.status === 'RUNNING').length,
    totalSent: campaigns.reduce((sum, c) => sum + c.totalSent, 0),
    avgOpenRate: campaigns.length > 0
      ? (campaigns.reduce((sum, c) => sum + (c.totalSent > 0 ? c.totalOpened / c.totalSent : 0), 0) / campaigns.length * 100).toFixed(1)
      : '0',
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">邮件营销</h1>
            <p className="text-sm text-gray-500">创建和管理邮件营销活动</p>
          </div>
          <div className="flex gap-2">
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="gap-2 rounded-none"
              >
                <List className="h-4 w-4" /> 列表
              </Button>
              <Button
                variant={viewMode === 'stats' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('stats')}
                className="gap-2 rounded-none"
              >
                <BarChart3 className="h-4 w-4" /> 统计
              </Button>
              <Button
                variant={viewMode === 'abtest' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('abtest')}
                className="gap-2 rounded-none"
              >
                <Beaker className="h-4 w-4" /> A/B测试
              </Button>
            </div>
            <Button className="gap-2" onClick={openAddDialog}>
              <Plus className="h-4 w-4" /> 创建活动
            </Button>
          </div>
        </div>

        {/* Stats View */}
        {viewMode === 'stats' && (
          <CampaignStats campaignId={selectedCampaignId} />
        )}

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
                      <p className="text-xs text-gray-500">进行中活动</p>
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
                      <p className="text-xs text-gray-500">总发送邮件</p>
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
                      <p className="text-xs text-gray-500">平均打开率</p>
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500">活动名称</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">类型</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">状态</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">已发送</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">打开率</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">回复率</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">创建时间</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">操作</th>
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
                      <p className="text-gray-500 font-medium">暂无邮件活动</p>
                      <p className="text-sm text-gray-400 mt-1">创建您的第一个邮件营销活动</p>
                      <Button className="mt-4 gap-2" onClick={openAddDialog}>
                        <Plus className="h-4 w-4" /> 创建活动
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
                              title="查看统计"
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
                <p className="text-sm text-gray-500">共 {total} 个活动</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    上一页
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 10)} onClick={() => setPage(p => p + 1)}>
                    下一页
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
              <h2 className="text-lg font-semibold">{currentCampaign ? '编辑活动' : '创建活动'}</h2>
              <button onClick={() => setShowDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>活动名称 *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如：北美科技公司拓客活动"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>活动类型</Label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="SINGLE">单次发送</option>
                    <option value="SEQUENCE">序列邮件</option>
                    <option value="AB_TEST">A/B测试</option>
                  </select>
                </div>
                <div>
                  <Label>发送方式</Label>
                  <select
                    value={form.scheduleType}
                    onChange={(e) => setForm({ ...form, scheduleType: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="IMMEDIATE">立即发送</option>
                    <option value="SCHEDULED">定时发送</option>
                  </select>
                </div>
              </div>
              {form.scheduleType === 'SCHEDULED' && (
                <div>
                  <Label>发送时间</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  />
                </div>
              )}
              <div>
                <Label>邮件主题 *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="支持变量如 {{firstName}}, {{companyName}}"
                />
              </div>
              <div>
                <Label>邮件内容 *</Label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="输入邮件内容..."
                  rows={10}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {currentCampaign ? '保存修改' : '创建活动'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
