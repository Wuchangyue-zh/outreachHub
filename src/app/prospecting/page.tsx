'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Search, Building, Globe, Users, Send, Loader2 } from 'lucide-react'

export default function ProspectingPage() {
  const [searching, setSearching] = useState(false)
  const [formData, setFormData] = useState({
    keywords: '',
    positions: '',
    locations: '',
    industries: '',
    companySizes: '',
  })

  const handleSearch = async () => {
    setSearching(true)
    try {
      const res = await fetch('/api/prospecting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'create-prospecting-task',
          taskData: {
            name: `拓客任务 - ${new Date().toLocaleDateString()}`,
            keywords: formData.keywords.split(',').map(s => s.trim()).filter(Boolean),
            positions: formData.positions.split(',').map(s => s.trim()).filter(Boolean),
            locations: formData.locations.split(',').map(s => s.trim()).filter(Boolean),
            industries: formData.industries.split(',').map(s => s.trim()).filter(Boolean),
            companySizes: formData.companySizes.split(',').map(s => s.trim()).filter(Boolean),
            status: 'PENDING',
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        alert('拓客任务已创建，等待执行')
      }
    } catch (e) {
      alert('创建任务失败')
    } finally {
      setSearching(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">智能拓客</h1>
          <p className="text-sm text-gray-500">通过AI技术精准定位和挖掘海外目标客户</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Search form */}
          <Card className="lg:col-span-2 border-gray-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                搜索条件
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>行业关键词（逗号分隔）</Label>
                <Input
                  placeholder="例如：Software, Technology, SaaS"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                />
              </div>
              <div>
                <Label>目标职位（逗号分隔）</Label>
                <Input
                  placeholder="例如：CTO, VP Engineering, Director"
                  value={formData.positions}
                  onChange={(e) => setFormData({ ...formData, positions: e.target.value })}
                />
              </div>
              <div>
                <Label>目标地区（逗号分隔）</Label>
                <Input
                  placeholder="例如：United States, Germany, Singapore"
                  value={formData.locations}
                  onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
                />
              </div>
              <div>
                <Label>行业类别（逗号分隔）</Label>
                <Input
                  placeholder="例如：Technology, Manufacturing, Retail"
                  value={formData.industries}
                  onChange={(e) => setFormData({ ...formData, industries: e.target.value })}
                />
              </div>
              <div>
                <Label>公司规模</Label>
                <Input
                  placeholder="例如：51-200, 201-500, 501-1000"
                  value={formData.companySizes}
                  onChange={(e) => setFormData({ ...formData, companySizes: e.target.value })}
                />
              </div>
              <Button onClick={handleSearch} disabled={searching} className="w-full">
                {searching ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 创建任务中...</>
                ) : (
                  <><Search className="mr-2 h-4 w-4" /> 创建拓客任务</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Tips */}
          <div className="space-y-6">
            <Card className="border-gray-100">
              <CardHeader>
                <CardTitle className="text-base">拓客技巧</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <p>💡 使用英文关键词搜索，结果更准确</p>
                <p>💡 职位使用英文标准名称，如 CTO、VP of Sales</p>
                <p>💡 地区使用国家英文名，如 United States、Germany</p>
                <p>💡 建议每次搜索限定1-2个行业，结果更精准</p>
              </CardContent>
            </Card>

            <Card className="border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900">获取邮箱方案</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    API数据源：RocketReach覆盖9亿+联系人
                  </li>
                  <li className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" />
                    智能推测：基于域名+AI推测邮箱格式
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    爬虫采集：自动化采集公开联系方式
                  </li>
                  <li className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    验证清洗：MillionVerifier确保有效送达
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
