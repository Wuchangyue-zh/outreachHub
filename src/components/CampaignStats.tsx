'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface GeoStats {
  country: string
  count: number
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function CampaignStats({ campaignId }: CampaignStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [campaignComparison, setCampaignComparison] = useState<CampaignComparison[]>([])
  const [geoStats, setGeoStats] = useState<GeoStats[]>([])
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
        setGeoStats(statsData.data.geo || [])
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
          <p className="text-gray-600">Loading statistics...</p>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No statistics available</p>
        </CardContent>
      </Card>
    )
  }

  const pieData = [
    { name: 'Opened', value: stats.totalOpened },
    { name: 'Clicked', value: stats.totalClicked },
    { name: 'Replied', value: stats.totalReplied },
    { name: 'Bounced', value: stats.totalBounced },
    { name: 'No Action', value: stats.totalSent - stats.totalOpened - stats.totalBounced },
  ]

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Sent</p>
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
                <p className="text-sm text-gray-600 mb-1">Open Rate</p>
                <p className="text-3xl font-bold text-gray-900">{stats.openRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">{stats.totalOpened.toLocaleString()} opened</p>
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
                <p className="text-sm text-gray-600 mb-1">Click Rate</p>
                <p className="text-3xl font-bold text-gray-900">{stats.clickRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">{stats.totalClicked.toLocaleString()} clicked</p>
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
                <p className="text-sm text-gray-600 mb-1">Reply Rate</p>
                <p className="text-3xl font-bold text-gray-900">{stats.replyRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">{stats.totalReplied.toLocaleString()} replied</p>
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
              Daily Performance
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
                <Line type="monotone" dataKey="sent" stroke="#3b82f6" name="Sent" strokeWidth={2} />
                <Line type="monotone" dataKey="opened" stroke="#10b981" name="Opened" strokeWidth={2} />
                <Line type="monotone" dataKey="clicked" stroke="#f59e0b" name="Clicked" strokeWidth={2} />
                <Line type="monotone" dataKey="replied" stroke="#8b5cf6" name="Replied" strokeWidth={2} />
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
              Campaign Comparison
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
                <Bar dataKey="openRate" fill="#10b981" name="Open Rate %" />
                <Bar dataKey="clickRate" fill="#f59e0b" name="Click Rate %" />
                <Bar dataKey="replyRate" fill="#8b5cf6" name="Reply Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* K2: 打开地理分布 */}
      {geoStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Opens by Country
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, geoStats.length * 32)}>
              <BarChart data={geoStats} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="country" width={48} />
                <Tooltip formatter={(value) => [value, 'Opens']} />
                <Bar dataKey="count" fill="#3b82f6" name="Opens" radius={[0, 4, 4, 0]} />
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
            Engagement Breakdown
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
            <CardTitle className="text-base">Bounce Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold text-red-600">{stats.bounceRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-600 mt-2">
                {stats.totalBounced.toLocaleString()} emails bounced
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">
                {((stats.openRate + stats.clickRate + stats.replyRate) / 3).toFixed(1)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Average of open, click, and reply rates
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
