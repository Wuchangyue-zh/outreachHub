'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Building2, Send, MailOpen, TrendingUp, Reply } from 'lucide-react'

interface Stats {
  totalContacts: number
  totalCompanies: number
  totalCampaigns: number
  emails_SENT: number
  emails_OPENED: number
  emails_REPLIED: number
}

export default function StatsOverview() {
  const [stats, setStats] = useState<Stats>({
    totalContacts: 0,
    totalCompanies: 0,
    totalCampaigns: 0,
    emails_SENT: 0,
    emails_OPENED: 0,
    emails_REPLIED: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const res = await fetch('/api/stats')
      const data = await res.json()
      if (data.success) {
        setStats((prev) => ({
          ...prev,
          ...data.data,
          emails_SENT: data.data.emails_SENT ?? 0,
          emails_OPENED: data.data.emails_OPENED ?? 0,
          emails_REPLIED: data.data.emails_REPLIED ?? 0,
        }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const openRate = stats.emails_SENT > 0
    ? ((stats.emails_OPENED / stats.emails_SENT) * 100).toFixed(1)
    : '0'

  const replyRate = stats.emails_SENT > 0
    ? ((stats.emails_REPLIED / stats.emails_SENT) * 100).toFixed(1)
    : '0'

  const statItems = [
    {
      title: '总客户数',
      value: stats.totalContacts.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '公司库',
      value: stats.totalCompanies.toLocaleString(),
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: '已发送邮件',
      value: stats.emails_SENT.toLocaleString(),
      icon: Send,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '邮件打开率',
      value: `${openRate}%`,
      icon: MailOpen,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: '回复率',
      value: `${replyRate}%`,
      icon: Reply,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      title: '营销活动',
      value: stats.totalCampaigns.toLocaleString(),
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-gray-100">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {statItems.map((stat) => (
        <Card key={stat.title} className="border-gray-100 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.title}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
