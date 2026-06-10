'use client'

<<<<<<< HEAD
import { useI18n } from '@/hooks/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function ActivityChart() {
  const { t } = useI18n()
  const data = [
    { name: t('dashboard.chart.mon'), sent: 120, opened: 58, replied: 12 },
    { name: t('dashboard.chart.tue'), sent: 200, opened: 95, replied: 22 },
    { name: t('dashboard.chart.wed'), sent: 180, opened: 88, replied: 18 },
    { name: t('dashboard.chart.thu'), sent: 250, opened: 115, replied: 28 },
    { name: t('dashboard.chart.fri'), sent: 160, opened: 72, replied: 15 },
    { name: t('dashboard.chart.sat'), sent: 80, opened: 35, replied: 8 },
    { name: t('dashboard.chart.sun'), sent: 45, opened: 20, replied: 4 },
  ]
=======
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface DailyStats {
  date: string
  sent: number
  opened: number
  clicked: number
  replied: number
}

export default function ActivityChart({ refreshToken = 0 }: { refreshToken?: number }) {
  const [data, setData] = useState<DailyStats[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/campaigns/stats')
      const json = await res.json()
      if (json.success && json.data?.daily) {
        const daily: DailyStats[] = json.data.daily
        // Show last 7 days for the weekly view
        setData(daily.slice(-7).map((d) => ({
          date: d.date.slice(5), // MM-DD format for display
          sent: d.sent,
          opened: d.opened,
          clicked: d.clicked,
          replied: d.replied,
        })))
      }
    } catch (e) {
      console.error('Failed to fetch activity data:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity, refreshToken])

>>>>>>> feat/landing-page
  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardTitle className="text-lg">{t('dashboard.weeklyActivity')}</CardTitle>
      </CardHeader>
      <CardContent>
<<<<<<< HEAD
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="sent" name={t('dashboard.chart.sent')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="opened" name={t('dashboard.chart.opened')} fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="replied" name={t('dashboard.chart.replied')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
=======
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
            暂无活动数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sent" name="已发送" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="opened" name="已打开" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="replied" name="已回复" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
>>>>>>> feat/landing-page
      </CardContent>
    </Card>
  )
}
