'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const data = [
  { name: '周一', sent: 120, opened: 58, replied: 12 },
  { name: '周二', sent: 200, opened: 95, replied: 22 },
  { name: '周三', sent: 180, opened: 88, replied: 18 },
  { name: '周四', sent: 250, opened: 115, replied: 28 },
  { name: '周五', sent: 160, opened: 72, replied: 15 },
  { name: '周六', sent: 80, opened: 35, replied: 8 },
  { name: '周日', sent: 45, opened: 20, replied: 4 },
]

export default function ActivityChart() {
  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardTitle className="text-lg">本周邮件活动</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="sent" name="已发送" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="opened" name="已打开" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="replied" name="已回复" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
