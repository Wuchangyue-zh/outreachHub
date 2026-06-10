'use client'

<<<<<<< HEAD
import { useState, useEffect } from 'react'
import { useI18n } from '@/hooks/use-i18n'
=======
import { useState, useEffect, useCallback } from 'react'
>>>>>>> feat/landing-page
import { Card, CardContent } from '@/components/ui/card'
import { Users, Building2, Send, MailOpen, TrendingUp, Reply, ShieldCheck, Container, Target, DollarSign } from 'lucide-react'

interface Stats {
  totalContacts: number
  totalCompanies: number
  totalCampaigns: number
  emails_SENT: number
  emails_OPENED: number
  emails_REPLIED: number
  emailVerification?: {
    verified: number
    total: number
    rate: number
  }
  customsImports?: number
  highIntentBuyers?: number
  activeDeals?: number
  wonAmount?: number
}

<<<<<<< HEAD
export default function StatsOverview() {
  const { t } = useI18n()
=======
export default function StatsOverview({ refreshToken = 0 }: { refreshToken?: number }) {
>>>>>>> feat/landing-page
  const [stats, setStats] = useState<Stats>({
    totalContacts: 0,
    totalCompanies: 0,
    totalCampaigns: 0,
    emails_SENT: 0,
    emails_OPENED: 0,
    emails_REPLIED: 0,
  })
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
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
          emailVerification: data.data.emailVerification,
          customsImports: data.data.customsImports ?? 0,
          highIntentBuyers: data.data.highIntentBuyers ?? 0,
          activeDeals: data.data.activeDeals ?? 0,
          wonAmount: data.data.wonAmount ?? 0,
        }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Q2d: Poll stats every 5 minutes; also refresh when SSE pushes new data
  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchStats, refreshToken])

  const openRate = stats.emails_SENT > 0
    ? ((stats.emails_OPENED / stats.emails_SENT) * 100).toFixed(1)
    : '0'

  const replyRate = stats.emails_SENT > 0
    ? ((stats.emails_REPLIED / stats.emails_SENT) * 100).toFixed(1)
    : '0'

  const verifyRate = stats.emailVerification?.rate ?? 0

  const statItems = [
    {
      title: t('dashboard.totalContacts'),
      value: stats.totalContacts.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: t('dashboard.totalCompanies'),
      value: stats.totalCompanies.toLocaleString(),
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: t('dashboard.emailsSent'),
      value: stats.emails_SENT.toLocaleString(),
      icon: Send,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: t('dashboard.openRate'),
      value: `${openRate}%`,
      icon: MailOpen,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: t('dashboard.replyRate'),
      value: `${replyRate}%`,
      icon: Reply,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
<<<<<<< HEAD
      title: t('dashboard.campaigns'),
=======
      title: '邮箱验证率',
      value: `${verifyRate}%`,
      icon: ShieldCheck,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      title: '营销活动',
>>>>>>> feat/landing-page
      value: stats.totalCampaigns.toLocaleString(),
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: '海关导入',
      value: (stats.customsImports ?? 0).toLocaleString(),
      icon: Container,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    {
      title: '高意向买家',
      value: (stats.highIntentBuyers ?? 0).toLocaleString(),
      icon: Target,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: '进行中商机',
      value: (stats.activeDeals ?? 0).toLocaleString(),
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: '成交金额',
      value: `$${(stats.wonAmount ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-11">
        {Array.from({ length: 11 }).map((_, i) => (
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-11">
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
              {stat.title === '邮箱验证率' && stats.emailVerification && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {stats.emailVerification.verified}/{stats.emailVerification.total} 已验证
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
