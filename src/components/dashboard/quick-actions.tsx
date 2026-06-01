'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, Users, Send, FileText, Plus, Container, TrendingUp } from 'lucide-react'
import Link from 'next/link'

const actions = [
  { name: '新建拓客任务', icon: Search, href: '/prospecting', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
  { name: '海关获客', icon: Container, href: '/customs', color: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100' },
  { name: '导入客户', icon: Users, href: '/contacts', color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
  { name: '创建邮件活动', icon: Send, href: '/campaigns', color: 'bg-green-50 text-green-600 hover:bg-green-100' },
  { name: '新建邮件模板', icon: FileText, href: '/templates', color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
  { name: '销售漏斗', icon: TrendingUp, href: '/dashboard/pipeline', color: 'bg-indigo-500' },
]

export default function QuickActions() {
  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardTitle className="text-lg">快捷操作</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Link key={action.name} href={action.href}>
              <Button
                variant="outline"
                className={`h-20 w-full flex-col gap-2 ${action.color}`}
              >
                <action.icon className="h-5 w-5" />
                <span className="text-xs">{action.name}</span>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
