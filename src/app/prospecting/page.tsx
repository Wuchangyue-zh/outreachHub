'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Building, Globe, Users, Send, Loader2, Download, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'search' | 'task'

interface CompanyResult {
  _id: number
  name: string
  email_domain?: string
  industry_str?: string
  country_code?: string
  website?: string
  size?: string
}

interface PersonResult {
  _id: string
  name: string
  current_title?: string
  current_employer?: string
  country?: string
  country_code?: string
  emails?: Array<{ address: string; type: string }>
  teaser?: { emails: string[] }
}

export default function ProspectingPage() {
  const [tab, setTab] = useState<Tab>('search')
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [searchMode, setSearchMode] = useState<'companies' | 'people'>('companies')
  const [companies, setCompanies] = useState<CompanyResult[]>([])
  const [people, setPeople] = useState<PersonResult[]>([])
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<number>>(new Set())
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')

  const [formData, setFormData] = useState({
    keywords: '',
    positions: '',
    locations: '',
    industries: '',
    companySizes: '',
    domain: '',
  })

  const handleSearch = async () => {
    setSearching(true)
    setMessage('')
    try {
      if (searchMode === 'companies') {
        const res = await fetch('/api/prospecting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'search-companies',
            params: {
              name: formData.keywords || undefined,
              industry: formData.industries.split(',')[0]?.trim() || undefined,
              location: formData.locations.split(',')[0]?.trim() || undefined,
              domain: formData.domain || undefined,
              limit: 25,
            },
          }),
        })
        const data = await res.json()
        if (data.success) {
          setCompanies(data.data || [])
          setSelectedCompanyIds(new Set())
          setMessage(data.data?.length ? `找到 ${data.data.length} 家公司` : '未找到结果，请调整搜索条件或配置 ROCKETREACH_API_KEY')
        } else {
          setMessage(data.message || '搜索失败')
        }
      } else {
        const res = await fetch('/api/prospecting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'search-people',
            params: {
              title: formData.positions.split(',')[0]?.trim() || undefined,
              location: formData.locations.split(',')[0]?.trim() || undefined,
              company: formData.keywords || undefined,
              domain: formData.domain || undefined,
              limit: 25,
            },
          }),
        })
        const data = await res.json()
        if (data.success) {
          setPeople(data.data || [])
          setSelectedPersonIds(new Set())
          setMessage(data.data?.length ? `找到 ${data.data.length} 位联系人` : '未找到结果，请调整搜索条件或配置 ROCKETREACH_API_KEY')
        } else {
          setMessage(data.message || '搜索失败')
        }
      }
    } catch {
      setMessage('搜索请求失败')
    } finally {
      setSearching(false)
    }
  }

  const handleImportCompanies = async () => {
    const selected = companies.filter((c) => selectedCompanyIds.has(c._id))
    if (selected.length === 0) {
      setMessage('请先勾选要导入的公司')
      return
    }
    setImporting(true)
    setMessage('')
    try {
      const res = await fetch('/api/prospecting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'import-companies',
          companies: selected.map((c) => ({
            name: c.name,
            domain: c.email_domain || null,
            industry: c.industry_str || null,
            country: c.country_code || null,
            size: c.size || null,
            website: c.website || null,
          })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(`公司导入完成：成功 ${data.data.imported}，跳过/失败 ${data.data.failed}`)
        setSelectedCompanyIds(new Set())
      } else {
        setMessage(data.message || '导入失败')
      }
    } catch {
      setMessage('导入请求失败')
    } finally {
      setImporting(false)
    }
  }

  const handleImportContacts = async () => {
    const selected = people.filter((p) => selectedPersonIds.has(p._id))
    if (selected.length === 0) {
      setMessage('请先勾选要导入的联系人')
      return
    }
    setImporting(true)
    setMessage('')
    try {
      const res = await fetch('/api/prospecting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'import-contacts',
          contacts: selected.map((p) => {
            const email = p.emails?.[0]?.address || p.teaser?.emails?.[0] || ''
            const parts = (p.name || '').trim().split(/\s+/)
            return {
              fullName: p.name,
              firstName: parts[0] || '',
              lastName: parts.slice(1).join(' ') || '',
              title: p.current_title || null,
              country: p.country || null,
              countryCode: p.country_code || null,
              email: email || undefined,
              tags: ['rocketreach'],
            }
          }),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(`联系人导入完成：成功 ${data.data.imported}，跳过/失败 ${data.data.failed}`)
        setSelectedPersonIds(new Set())
      } else {
        setMessage(data.message || '导入失败')
      }
    } catch {
      setMessage('导入请求失败')
    } finally {
      setImporting(false)
    }
  }

  const handleCreateTask = async () => {
    setSearching(true)
    setMessage('')
    try {
      const res = await fetch('/api/prospecting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'create-prospecting-task',
          taskData: {
            name: `拓客任务 - ${new Date().toLocaleDateString()}`,
            keywords: formData.keywords.split(',').map((s) => s.trim()).filter(Boolean),
            positions: formData.positions.split(',').map((s) => s.trim()).filter(Boolean),
            locations: formData.locations.split(',').map((s) => s.trim()).filter(Boolean),
            industries: formData.industries.split(',').map((s) => s.trim()).filter(Boolean),
            companySizes: formData.companySizes.split(',').map((s) => s.trim()).filter(Boolean),
            status: 'PENDING',
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage('拓客任务已创建，等待后台执行')
      } else {
        setMessage(data.message || '创建任务失败')
      }
    } catch {
      setMessage('创建任务失败')
    } finally {
      setSearching(false)
    }
  }

  const toggleCompany = (id: number) => {
    const next = new Set(selectedCompanyIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedCompanyIds(next)
  }

  const togglePerson = (id: string) => {
    const next = new Set(selectedPersonIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedPersonIds(next)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">智能拓客</h1>
          <p className="text-sm text-gray-500">RocketReach 搜索并一键导入公司与联系人</p>
        </div>

        <div className="flex gap-2">
          {(
            [
              { id: 'search' as Tab, label: 'RocketReach 搜索', icon: Search },
              { id: 'task' as Tab, label: '创建拓客任务', icon: Send },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                tab === id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {message && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-gray-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                {tab === 'search' ? '搜索条件' : '任务条件'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tab === 'search' && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={searchMode === 'companies' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchMode('companies')}
                  >
                    <Building className="mr-1 h-4 w-4" /> 搜公司
                  </Button>
                  <Button
                    type="button"
                    variant={searchMode === 'people' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSearchMode('people')}
                  >
                    <UserPlus className="mr-1 h-4 w-4" /> 搜联系人
                  </Button>
                </div>
              )}

              <div>
                <Label>{searchMode === 'companies' || tab === 'task' ? '关键词 / 公司名' : '公司 / 关键词'}</Label>
                <Input
                  placeholder="例如：SaaS, Acme Corp"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                />
              </div>
              {(tab === 'task' || searchMode === 'people') && (
                <div>
                  <Label>目标职位（逗号分隔）</Label>
                  <Input
                    placeholder="例如：CTO, VP Engineering"
                    value={formData.positions}
                    onChange={(e) => setFormData({ ...formData, positions: e.target.value })}
                  />
                </div>
              )}
              <div>
                <Label>目标地区</Label>
                <Input
                  placeholder="例如：United States, Germany"
                  value={formData.locations}
                  onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
                />
              </div>
              {(tab === 'task' || searchMode === 'companies') && (
                <>
                  <div>
                    <Label>行业类别</Label>
                    <Input
                      placeholder="例如：Technology, Software"
                      value={formData.industries}
                      onChange={(e) => setFormData({ ...formData, industries: e.target.value })}
                    />
                  </div>
                  {tab === 'task' && (
                    <div>
                      <Label>公司规模</Label>
                      <Input
                        placeholder="例如：51-200, 201-500"
                        value={formData.companySizes}
                        onChange={(e) => setFormData({ ...formData, companySizes: e.target.value })}
                      />
                    </div>
                  )}
                </>
              )}
              {tab === 'search' && (
                <div>
                  <Label>域名（可选）</Label>
                  <Input
                    placeholder="例如：example.com"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  />
                </div>
              )}

              <Button
                onClick={tab === 'search' ? handleSearch : handleCreateTask}
                disabled={searching}
                className="w-full"
              >
                {searching ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 处理中...</>
                ) : tab === 'search' ? (
                  <><Search className="mr-2 h-4 w-4" /> 搜索</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> 创建拓客任务</>
                )}
              </Button>

              {tab === 'search' && searchMode === 'companies' && companies.length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">搜索结果（{companies.length}）</p>
                    <Button
                      size="sm"
                      disabled={importing || selectedCompanyIds.size === 0}
                      onClick={handleImportCompanies}
                    >
                      {importing ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-1 h-4 w-4" />
                      )}
                      导入选中（{selectedCompanyIds.size}）
                    </Button>
                  </div>
                  <div className="max-h-80 overflow-y-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50 text-left text-xs text-gray-500">
                        <tr>
                          <th className="p-2 w-8" />
                          <th className="p-2">公司</th>
                          <th className="p-2">域名</th>
                          <th className="p-2">行业</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.map((c) => (
                          <tr key={c._id} className="border-t hover:bg-gray-50">
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={selectedCompanyIds.has(c._id)}
                                onChange={() => toggleCompany(c._id)}
                              />
                            </td>
                            <td className="p-2 font-medium">{c.name}</td>
                            <td className="p-2 text-gray-600">{c.email_domain || '—'}</td>
                            <td className="p-2 text-gray-600">{c.industry_str || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'search' && searchMode === 'people' && people.length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">搜索结果（{people.length}）</p>
                    <Button
                      size="sm"
                      disabled={importing || selectedPersonIds.size === 0}
                      onClick={handleImportContacts}
                    >
                      {importing ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-1 h-4 w-4" />
                      )}
                      导入选中（{selectedPersonIds.size}）
                    </Button>
                  </div>
                  <div className="max-h-80 overflow-y-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50 text-left text-xs text-gray-500">
                        <tr>
                          <th className="p-2 w-8" />
                          <th className="p-2">姓名</th>
                          <th className="p-2">职位</th>
                          <th className="p-2">邮箱</th>
                        </tr>
                      </thead>
                      <tbody>
                        {people.map((p) => (
                          <tr key={p._id} className="border-t hover:bg-gray-50">
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={selectedPersonIds.has(p._id)}
                                onChange={() => togglePerson(p._id)}
                              />
                            </td>
                            <td className="p-2 font-medium">{p.name}</td>
                            <td className="p-2 text-gray-600">{p.current_title || '—'}</td>
                            <td className="p-2 text-gray-600">
                              {p.emails?.[0]?.address || p.teaser?.emails?.[0] || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-gray-100">
              <CardHeader>
                <CardTitle className="text-base">拓客技巧</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <p>💡 使用英文关键词搜索，结果更准确</p>
                <p>💡 职位使用英文标准名称，如 CTO、VP of Sales</p>
                <p>💡 地区使用国家英文名，如 United States、Germany</p>
                <p>💡 勾选结果后点击「导入选中」写入公司/联系人库</p>
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
