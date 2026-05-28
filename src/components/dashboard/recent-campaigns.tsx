'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Campaign {
  id: string
  name: string
  status: string
  totalSent: number
  totalOpened: number
  totalReplied: number
  createdAt: string
}

export default function RecentCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentCampaigns()
  }, [])

  async function fetchRecentCampaigns() {
    try {
      const res = await fetch('/api/stats')
      const data = await res.json()
      if (data.success && data.data.recentCampaigns) {
        setCampaigns(data.data.recentCampaigns)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    RUNNING: { label: '进行中', color: 'bg-green-100 text-green-700' },
    COMPLETED: { label: '已完成', color: 'bg-blue-100 text-blue-700' },
    SCHEDULED: { label: '已排期', color: 'bg-yellow-100 text-yellow-700' },
    DRAFT: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
    PAUSED: { label: '已暂停', color: 'bg-orange-100 text-orange-700' },
    FAILED: { label: '失败', color: 'bg-red-100 text-red-700' },
  }

  if (loading) {
    return (
      <Card className="border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg">近期邮件活动</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardTitle className="text-lg">近期邮件活动</CardTitle>
      </CardHeader>
      <CardContent>
        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>暂无邮件活动</p>
            <p className="text-sm mt-1">创建您的第一个邮件营销活动</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-left font-medium text-gray-500">活动名称</th>
                  <th className="pb-3 text-left font-medium text-gray-500">状态</th>
                  <th className="pb-3 text-right font-medium text-gray-500">已发送</th>
                  <th className="pb-3 text-right font-medium text-gray-500">打开率</th>
                  <th className="pb-3 text-right font-medium text-gray-500">回复率</th>
                  <th className="pb-3 text-right font-medium text-gray-500">日期</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const status = statusMap[campaign.status] || { label: campaign.status, color: 'bg-gray-100 text-gray-700' }
                  const openRate = campaign.totalSent > 0
                    ? `${((campaign.totalOpened / campaign.totalSent) * 100).toFixed(1)}%`
                    : '-'
                  const replyRate = campaign.totalSent > 0
                    ? `${((campaign.totalReplied / campaign.totalSent) * 100).toFixed(1)}%`
                    : '-'
                  return (
                    <tr key={campaign.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-900">{campaign.name}</td>
                      <td className="py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 text-right text-gray-600">{campaign.totalSent.toLocaleString()}</td>
                      <td className="py-3 text-right text-gray-600">{openRate}</td>
                      <td className="py-3 text-right text-gray-600">{replyRate}</td>
                      <td className="py-3 text-right text-gray-500">
                        {new Date(campaign.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
