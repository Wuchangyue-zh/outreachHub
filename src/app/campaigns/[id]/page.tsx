'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  ArrowLeft, RefreshCw, Mail, Eye, MousePointer, MessageSquare,
  AlertCircle, Users, Calendar, Clock, Play, Pause, BarChart3,
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  status: string
  type: string
  subject: string | null
  content: string | null
  fromName: string | null
  fromEmail: string | null
  totalSent: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  totalBounced: number
  totalFailed: number
  openRate: number
  clickRate: number
  replyRate: number
  bounceRate: number
  scheduleType: string | null
  scheduledAt: string | null
  sentAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

interface EmailLog {
  id: string
  toEmail: string
  subject: string
  status: string
  sentAt: string | null
  openedAt: string | null
  clickedAt: string | null
  repliedAt: string | null
  bouncedAt: string | null
  createdAt: string
}

interface CampaignContact {
  id: string
  contactId: string
  status: string
  contact?: { fullName: string; emails?: { address: string }[] }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: '草稿', color: 'text-gray-700', bg: 'bg-gray-100' },
  SCHEDULED: { label: '已排期', color: 'text-blue-700', bg: 'bg-blue-100' },
  RUNNING: { label: '运行中', color: 'text-green-700', bg: 'bg-green-100' },
  PAUSED: { label: '已暂停', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  COMPLETED: { label: '已完成', color: 'text-purple-700', bg: 'bg-purple-100' },
  FAILED: { label: '失败', color: 'text-red-700', bg: 'bg-red-100' },
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [contacts, setContacts] = useState<CampaignContact[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`)
      const data = await res.json()
      if (data.success) {
        const c = data.data
        setCampaign(c)
        setEmailLogs(c.emailLogs || [])
        setContacts(c.campaignContacts || [])
      } else {
        toast.error(data.error?.message || '加载失败')
      }
    } catch {
      toast.error('加载活动详情失败')
    }
  }, [campaignId])

  const loadAll = useCallback(async () => {
    setLoading(true)
    await fetchCampaign()
    setLoading(false)
  }, [fetchCampaign])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handlePauseResume = async () => {
    if (!campaign) return
    const newStatus = campaign.status === 'RUNNING' ? 'PAUSED' : 'RUNNING'
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        setCampaign(data.data)
        toast.success(newStatus === 'PAUSED' ? '活动已暂停' : '活动已恢复')
      } else {
        toast.error(data.error?.message || '操作失败')
      }
    } catch {
      toast.error('操作失败')
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    )
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-gray-500">活动不存在</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/campaigns')}>
            返回活动列表
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.DRAFT

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/campaigns')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <Badge className={`${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {campaign.type === 'SINGLE' ? '单次发送' : campaign.type === 'SEQUENCE' ? '序列邮件' : campaign.type}
              {campaign.sentAt && ` · 发送于 ${new Date(campaign.sentAt).toLocaleString('zh-CN')}`}
            </p>
          </div>
          <div className="flex gap-2">
            {(campaign.status === 'RUNNING' || campaign.status === 'PAUSED') && (
              <Button variant="outline" onClick={handlePauseResume}>
                {campaign.status === 'RUNNING' ? (
                  <><Pause className="h-4 w-4 mr-1" /> 暂停</>
                ) : (
                  <><Play className="h-4 w-4 mr-1" /> 恢复</>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { icon: Mail, label: '已发送', value: campaign.totalSent, color: 'text-blue-600' },
            { icon: Eye, label: '已打开', value: campaign.totalOpened, color: 'text-green-600', sub: `${campaign.openRate}%` },
            { icon: MousePointer, label: '已点击', value: campaign.totalClicked, color: 'text-purple-600', sub: `${campaign.clickRate}%` },
            { icon: MessageSquare, label: '已回复', value: campaign.totalReplied, color: 'text-cyan-600', sub: `${campaign.replyRate}%` },
            { icon: AlertCircle, label: '退信', value: campaign.totalBounced, color: 'text-orange-600', sub: `${campaign.bounceRate}%` },
            { icon: Users, label: '受众', value: contacts.length, color: 'text-gray-600' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-gray-500">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
                {stat.sub && <p className="text-xs text-gray-400">{stat.sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="logs">发送日志 ({emailLogs.length})</TabsTrigger>
            <TabsTrigger value="contacts">受众 ({contacts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">基本信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">主题</span>
                    <span className="font-medium">{campaign.subject || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">发件人</span>
                    <span className="font-medium">{campaign.fromName ? `${campaign.fromName} <${campaign.fromEmail}>` : campaign.fromEmail || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">排期类型</span>
                    <span className="font-medium">{campaign.scheduleType || '立即发送'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">创建时间</span>
                    <span className="font-medium">{new Date(campaign.createdAt).toLocaleString('zh-CN')}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">效果概览</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: '打开率', value: campaign.openRate, color: 'bg-green-500' },
                    { label: '点击率', value: campaign.clickRate, color: 'bg-purple-500' },
                    { label: '回复率', value: campaign.replyRate, color: 'bg-cyan-500' },
                    { label: '退信率', value: campaign.bounceRate, color: 'bg-orange-500' },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">{metric.label}</span>
                        <span className="font-medium">{metric.value}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${metric.color}`}
                          style={{ width: `${Math.min(metric.value, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {campaign.content && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">邮件内容</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: campaign.content }} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-3 text-left font-medium text-gray-500">收件人</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">主题</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">状态</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">发送时间</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">打开/点击</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                            暂无发送日志
                          </td>
                        </tr>
                      ) : (
                        emailLogs.map((log) => (
                          <tr key={log.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">{log.toEmail}</td>
                            <td className="px-4 py-3 truncate max-w-[200px]">{log.subject}</td>
                            <td className="px-4 py-3">
                              <Badge className={
                                log.status === 'SENT' || log.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                log.status === 'OPENED' ? 'bg-blue-100 text-blue-700' :
                                log.status === 'CLICKED' ? 'bg-purple-100 text-purple-700' :
                                log.status === 'REPLIED' ? 'bg-cyan-100 text-cyan-700' :
                                log.status === 'BOUNCED' ? 'bg-orange-100 text-orange-700' :
                                log.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }>{log.status}</Badge>
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {log.sentAt ? new Date(log.sentAt).toLocaleString('zh-CN') : '-'}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {log.openedAt && <span className="text-green-600">✓ 打开</span>}
                              {log.clickedAt && <span className="ml-2 text-purple-600">✓ 点击</span>}
                              {log.repliedAt && <span className="ml-2 text-cyan-600">✓ 回复</span>}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-3 text-left font-medium text-gray-500">姓名</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">邮箱</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                            暂无受众联系人
                          </td>
                        </tr>
                      ) : (
                        contacts.map((cc) => (
                          <tr key={cc.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">{cc.contact?.fullName || cc.contactId}</td>
                            <td className="px-4 py-3">{cc.contact?.emails?.[0]?.address || '-'}</td>
                            <td className="px-4 py-3">
                              <Badge className={
                                cc.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                cc.status === 'PENDING' ? 'bg-gray-100 text-gray-700' :
                                cc.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }>{cc.status}</Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
