'use client'

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
  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardTitle className="text-lg">{t('dashboard.weeklyActivity')}</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
