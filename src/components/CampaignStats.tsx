'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/hooks/use-i18n'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { TrendingUp, Mail, Eye, MousePointer, Reply, Globe } from 'lucide-react'

interface CampaignStatsProps {
  campaignId?: string
}

interface StatsData {
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

interface DailyStats {
  date: string
  sent: number
  opened: number
  clicked: number
  replied: number
}

interface CampaignComparison {
  name: string
  openRate: number
  clickRate: number
  replyRate: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function CampaignStats({ campaignId }: CampaignStatsProps) {
  const { t } = useI18n()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [campaignComparison, setCampaignComparison] = useState<CampaignComparison[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [campaignId])

  async function fetchStats() {
    setLoading(true)
    try {
      // Fetch overall stats
      const statsRes = await fetch(`/api/campaigns/stats${campaignId ? `?campaignId=${campaignId}` : ''}`)
      const statsData = await statsRes.json()
      if (statsData.success) {
        setStats(statsData.data.overall)
        setDailyStats(statsData.data.daily || [])
        setCampaignComparison(statsData.data.comparison || [])
      }
    } catch (e) {
      console.error('Failed to fetch campaign stats:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('campaignStats.loading')}</p>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">{t('campaignStats.noData')}</p>
        </CardContent>
      </Card>
    )
  }

  const pieData = [
    { name: t('campaignStats.pieLabels.opened'), value: stats.totalOpened },
    { name: t('campaignStats.pieLabels.clicked'), value: stats.totalClicked },
    { name: t('campaignStats.pieLabels.replied'), value: stats.totalReplied },
    { name: t('campaignStats.pieLabels.bounced'), value: stats.totalBounced },
    { name: t('campaignStats.pieLabels.noAction'), value: stats.totalSent - stats.totalOpened - stats.totalBounced },
  ]

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('campaignStats.totalSent')}</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalSent.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('campaignStats.openRate')}</p>
                <p className="text-3xl font-bold text-gray-900">{stats.openRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">{stats.totalOpened.toLocaleString()} {t('campaignStats.opened')}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('campaignStats.clickRate')}</p>
                <p className="text-3xl font-bold text-gray-900">{stats.clickRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">{stats.totalClicked.toLocaleString()} {t('campaignStats.clicked')}</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <MousePointer className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('campaignStats.replyRate')}</p>
                <p className="text-3xl font-bold text-gray-900">{stats.replyRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">{stats.totalReplied.toLocaleString()} {t('campaignStats.replied')}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Reply className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Performance Chart */}
      {dailyStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('campaignStats.dailyPerformance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sent" stroke="#3b82f6" name={t('campaignStats.legend.sent')} strokeWidth={2} />
                <Line type="monotone" dataKey="opened" stroke="#10b981" name={t('campaignStats.legend.opened')} strokeWidth={2} />
                <Line type="monotone" dataKey="clicked" stroke="#f59e0b" name={t('campaignStats.legend.clicked')} strokeWidth={2} />
                <Line type="monotone" dataKey="replied" stroke="#8b5cf6" name={t('campaignStats.legend.replied')} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Campaign Comparison */}
      {campaignComparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              {t('campaignStats.comparison')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campaignComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="openRate" fill="#10b981" name={t('campaignStats.legendPercent.openRate')} />
                <Bar dataKey="clickRate" fill="#f59e0b" name={t('campaignStats.legendPercent.clickRate')} />
                <Bar dataKey="replyRate" fill="#8b5cf6" name={t('campaignStats.legendPercent.replyRate')} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Engagement Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            {t('campaignStats.engagementBreakdown')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('campaignStats.bounceRate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold text-red-600">{stats.bounceRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-600 mt-2">
                {t('campaignStats.bounced').replace('{n}', stats.totalBounced.toLocaleString())}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('campaignStats.engagementScore')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">
                {((stats.openRate + stats.clickRate + stats.replyRate) / 3).toFixed(1)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {t('campaignStats.engagementDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
