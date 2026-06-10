'use client'

<<<<<<< HEAD
import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
=======
import { useState, useEffect } from 'react'
>>>>>>> feat/landing-page
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Building, Globe, Users, Send, Loader2, Download, UserPlus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'search' | 'task' | 'tasks'

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
  firstName?: string
  lastName?: string
  current_title?: string
  current_employer?: string
  country?: string
  country_code?: string
  emails?: Array<{ address: string; type: string }>
  teaser?: { emails: string[] }
  source?: string
  sources?: string[]
}

interface DataSourceStatus {
  name: string
  env: string
  configured: boolean
}

export default function ProspectingPage() {
<<<<<<< HEAD
  const { t } = useI18n()
=======
  const [tab, setTab] = useState<Tab>('search')
>>>>>>> feat/landing-page
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [searchMode, setSearchMode] = useState<'companies' | 'people'>('companies')
  const [companies, setCompanies] = useState<CompanyResult[]>([])
  const [people, setPeople] = useState<PersonResult[]>([])
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<number>>(new Set())
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')

  const [suggesting, setSuggesting] = useState(false)
  const [tasks, setTasks] = useState<any[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)

  const [formData, setFormData] = useState({
    keywords: '',
    positions: '',
    locations: '',
    industries: '',
    companySizes: '',
    domain: '',
  })
  const [peopleSources, setPeopleSources] = useState({ rocketreach: true, apollo: true })
  const [dataSources, setDataSources] = useState<DataSourceStatus[]>([])

  useEffect(() => {
    fetch('/api/settings/data-sources')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setDataSources(d.data.providers || [])
      })
      .catch(() => {})
  }, [])

  const isSourceConfigured = (env: string) =>
    dataSources.find((s) => s.env === env)?.configured ?? false

  const fetchTasks = async () => {
    setTasksLoading(true)
    try {
      const res = await fetch('/api/prospecting?page=1&limit=50')
      const data = await res.json()
      if (data.success) setTasks(data.data || [])
      else setMessage(data.error?.message || '加载任务列表失败，请稍后重试')
    } catch {
      setMessage('加载任务列表失败，请稍后重试')
    } finally {
      setTasksLoading(false)
    }
  }

  const apiErrorMessage = (data: { error?: { message?: string }; message?: string }, fallback: string) =>
    data.error?.message || data.message || fallback

  // 任务列表 tab：定时刷新进度
  useEffect(() => {
    if (tab !== 'tasks') return
    const id = setInterval(fetchTasks, 8000)
    return () => clearInterval(id)
  }, [tab])

  // 切换到 tasks tab 时加载
  const handleTabChange = (newTab: Tab) => {
    setTab(newTab)
    if (newTab === 'tasks') fetchTasks()
  }

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
        const sources = (['rocketreach', 'apollo'] as const).filter((s) => peopleSources[s])
        if (sources.length === 0) {
          setMessage('请至少选择一个数据源')
          setSearching(false)
          return
        }
        const res = await fetch('/api/prospecting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'search-people-multi',
            params: {
              sources,
              keywords: formData.keywords ? [formData.keywords] : undefined,
              title: formData.positions.split(',')[0]?.trim() || undefined,
              location: formData.locations.split(',')[0]?.trim() || undefined,
              company: formData.keywords || undefined,
              limit: 25,
            },
          }),
        })
        const data = await res.json()
        if (data.success) {
          const mapped: PersonResult[] = (data.data || []).map((c: {
            sourceId?: string
            fullName: string
            firstName?: string
            lastName?: string
            title?: string
            company?: string
            country?: string
            emails: string[]
            source: string
            sources?: string[]
          }) => ({
            _id: c.sourceId || c.emails[0] || `${c.fullName}-${c.source}`,
            name: c.fullName,
            firstName: c.firstName,
            lastName: c.lastName,
            current_title: c.title,
            current_employer: c.company,
            country: c.country,
            emails: c.emails.map((e) => ({ address: e, type: 'work' })),
            teaser: { emails: c.emails },
            source: c.source,
            sources: c.sources || [c.source],
          }))
          setPeople(mapped)
          setSelectedPersonIds(new Set())
          const meta = data.meta
          setMessage(
            mapped.length
              ? `找到 ${mapped.length} 位联系人（${meta?.sources?.join(' + ') || '多源'}，去重前 ${meta?.totalRaw ?? mapped.length}）`
              : '未找到结果，请调整搜索条件或配置数据源 API Key'
          )
        } else {
          setMessage(apiErrorMessage(data, '搜索失败'))
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
            const source = p.sources?.[0] || p.source || 'prospecting'
            return {
              fullName: p.name,
              firstName: p.firstName || parts[0] || '',
              lastName: p.lastName || parts.slice(1).join(' ') || '',
              title: p.current_title || null,
              country: p.country || null,
              countryCode: p.country_code || null,
              email: email || undefined,
              source,
              tags: p.sources || [source],
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
<<<<<<< HEAD
            name: `${t('prospecting.taskPrefix')} - ${new Date().toLocaleDateString()}`,
            keywords: formData.keywords.split(',').map(s => s.trim()).filter(Boolean),
            positions: formData.positions.split(',').map(s => s.trim()).filter(Boolean),
            locations: formData.locations.split(',').map(s => s.trim()).filter(Boolean),
            industries: formData.industries.split(',').map(s => s.trim()).filter(Boolean),
            companySizes: formData.companySizes.split(',').map(s => s.trim()).filter(Boolean),
=======
            name: `拓客任务 - ${new Date().toLocaleDateString()}`,
            keywords: formData.keywords.split(',').map((s) => s.trim()).filter(Boolean),
            positions: formData.positions.split(',').map((s) => s.trim()).filter(Boolean),
            locations: formData.locations.split(',').map((s) => s.trim()).filter(Boolean),
            industries: formData.industries.split(',').map((s) => s.trim()).filter(Boolean),
            companySizes: formData.companySizes.split(',').map((s) => s.trim()).filter(Boolean),
>>>>>>> feat/landing-page
            status: 'PENDING',
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
<<<<<<< HEAD
        alert(t('prospecting.taskCreated'))
      }
    } catch (e) {
      alert(t('prospecting.taskFailed'))
=======
        setMessage('拓客任务已创建，等待后台执行（本地可 curl process-prospecting cron）')
        handleTabChange('tasks')
      } else {
        setMessage(apiErrorMessage(data, '创建任务失败'))
      }
    } catch {
      setMessage('创建任务失败')
>>>>>>> feat/landing-page
    } finally {
      setSearching(false)
    }
  }

  // #27: AI 拓词/职位建议
  const handleAISuggest = async (type: 'keywords' | 'positions') => {
    const industry = formData.industries.split(',')[0]?.trim() || formData.keywords.split(',')[0]?.trim()
    if (!industry) {
      setMessage('请先填写行业或关键词')
      return
    }
    setSuggesting(true)
    try {
      const res = await fetch('/api/prospecting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type === 'keywords' ? 'suggest-keywords' : 'suggest-positions',
          params: {
            industry,
            existingKeywords: formData.keywords.split(',').map((s) => s.trim()).filter(Boolean),
          },
        }),
      })
      const data = await res.json()
      if (data.success && data.data?.suggestions?.length) {
        const suggestions = data.data.suggestions as string[]
        if (type === 'keywords') {
          const existing = formData.keywords.split(',').map((s) => s.trim()).filter(Boolean)
          const merged = [...new Set([...existing, ...suggestions])].slice(0, 20)
          setFormData({ ...formData, keywords: merged.join(', ') })
          setMessage(`AI 建议了 ${suggestions.length} 个关键词，已添加到列表`)
        } else {
          const existing = formData.positions.split(',').map((s) => s.trim()).filter(Boolean)
          const merged = [...new Set([...existing, ...suggestions])].slice(0, 15)
          setFormData({ ...formData, positions: merged.join(', ') })
          setMessage(`AI 建议了 ${suggestions.length} 个职位，已添加到列表`)
        }
      } else {
        setMessage(apiErrorMessage(data, 'AI 未能生成建议，请检查行业信息'))
      }
    } catch {
      setMessage('AI 建议请求失败')
    } finally {
      setSuggesting(false)
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
<<<<<<< HEAD
          <h1 className="text-2xl font-bold text-gray-900">{t('prospecting.title')}</h1>
          <p className="text-sm text-gray-500">{t('prospecting.subtitle')}</p>
=======
          <h1 className="text-2xl font-bold text-gray-900">智能拓客</h1>
          <p className="text-sm text-gray-500">RocketReach 搜索并一键导入公司与联系人</p>
>>>>>>> feat/landing-page
        </div>

        <div className="flex gap-2">
          {(
            [
              { id: 'search' as Tab, label: 'RocketReach 搜索', icon: Search },
              { id: 'task' as Tab, label: '创建拓客任务', icon: Send },
              { id: 'tasks' as Tab, label: '任务列表', icon: Download },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleTabChange(id)}
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
<<<<<<< HEAD
                {t('prospecting.searchCriteria')}
=======
                {tab === 'search' ? '搜索条件' : '任务条件'}
>>>>>>> feat/landing-page
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tab === 'tasks' ? (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={fetchTasks} disabled={tasksLoading}>
                      {tasksLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      刷新列表
                    </Button>
                  </div>
                  {tasksLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">加载中...</p>
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>暂无拓客任务</p>
                      <p className="text-xs text-gray-400 mt-1">切换到「创建拓客任务」开始</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {tasks.map((task: any) => {
                        const statusCfg: Record<string, { label: string; color: string }> = {
                          DRAFT: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
                          PENDING: { label: '待执行', color: 'bg-yellow-100 text-yellow-700' },
                          RUNNING: { label: '执行中', color: 'bg-blue-100 text-blue-700' },
                          COMPLETED: { label: '已完成', color: 'bg-green-100 text-green-700' },
                          FAILED: { label: '失败', color: 'bg-red-100 text-red-700' },
                        }
                        const cfg = statusCfg[task.status] || statusCfg.DRAFT
                        const progress = Math.round(task.crawlerProgress || task.progress || 0)

                        return (
                          <div key={task.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">{task.name}</p>
                              <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                                {cfg.label}
                              </span>
                            </div>
                            {task.status === 'FAILED' && task.description && (
                              <p className="text-xs text-red-600">{task.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {task.keywords?.length > 0 && (
                                <span>关键词: {task.keywords.slice(0, 3).join(', ')}{task.keywords.length > 3 ? '...' : ''}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-gray-200">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    task.status === 'COMPLETED' ? 'bg-green-500' :
                                    task.status === 'RUNNING' ? 'bg-blue-500' :
                                    task.status === 'FAILED' ? 'bg-red-500' : 'bg-gray-400'
                                  }`}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-8 text-right">{progress}%</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span>公司: {task.totalCompaniesSaved || 0}/{task.totalCompaniesFound || 0}</span>
                              <span>联系人: {task.totalContactsSaved || 0}/{task.totalContactsFound || 0}</span>
                              <span>{new Date(task.createdAt).toLocaleDateString('zh-CN')}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
              <>
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
<<<<<<< HEAD
                <Label>{t('prospecting.keywords')}</Label>
                <Input
                  placeholder={t('prospecting.keywordsPlaceholder')}
=======
                <div className="flex items-center justify-between">
                  <Label>{searchMode === 'companies' || tab === 'task' ? '关键词 / 公司名' : '公司 / 关键词'}</Label>
                  {tab === 'task' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAISuggest('keywords')}
                      disabled={suggesting}
                      className="h-6 gap-1 text-xs text-purple-600 hover:text-purple-700"
                    >
                      {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      AI 拓词
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="例如：SaaS, Acme Corp"
>>>>>>> feat/landing-page
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                />
              </div>
              {(tab === 'task' || searchMode === 'people') && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label>目标职位（逗号分隔）</Label>
                    {tab === 'task' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAISuggest('positions')}
                        disabled={suggesting}
                        className="h-6 gap-1 text-xs text-purple-600 hover:text-purple-700"
                      >
                        {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        AI 职位
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="例如：CTO, VP Engineering"
                    value={formData.positions}
                    onChange={(e) => setFormData({ ...formData, positions: e.target.value })}
                  />
                </div>
              )}
              {tab === 'search' && searchMode === 'people' && (
                <div>
                  <Label>数据源（多选并行搜索）</Label>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {([
                      { key: 'rocketreach' as const, label: 'RocketReach', env: 'ROCKETREACH_API_KEY' },
                      { key: 'apollo' as const, label: 'Apollo.io', env: 'APOLLO_API_KEY' },
                    ]).map(({ key, label, env }) => {
                      const configured = dataSources.length === 0 || isSourceConfigured(env)
                      return (
                        <label
                          key={key}
                          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                            configured ? 'border-gray-200' : 'border-gray-100 bg-gray-50 text-gray-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={peopleSources[key]}
                            disabled={!configured}
                            onChange={(e) =>
                              setPeopleSources((prev) => ({ ...prev, [key]: e.target.checked }))
                            }
                          />
                          {label}
                          {!configured && <span className="text-xs">(未配置)</span>}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
              <div>
<<<<<<< HEAD
                <Label>{t('prospecting.positions')}</Label>
                <Input
                  placeholder={t('prospecting.positionsPlaceholder')}
                  value={formData.positions}
                  onChange={(e) => setFormData({ ...formData, positions: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('prospecting.locations')}</Label>
                <Input
                  placeholder={t('prospecting.locationsPlaceholder')}
=======
                <Label>目标地区</Label>
                <Input
                  placeholder="例如：United States, Germany"
>>>>>>> feat/landing-page
                  value={formData.locations}
                  onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
                />
              </div>
<<<<<<< HEAD
              <div>
                <Label>{t('prospecting.industries')}</Label>
                <Input
                  placeholder={t('prospecting.industriesPlaceholder')}
                  value={formData.industries}
                  onChange={(e) => setFormData({ ...formData, industries: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('prospecting.companySize')}</Label>
                <Input
                  placeholder={t('prospecting.companySizePlaceholder')}
                  value={formData.companySizes}
                  onChange={(e) => setFormData({ ...formData, companySizes: e.target.value })}
                />
              </div>
              <Button onClick={handleSearch} disabled={searching} className="w-full">
                {searching ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('prospecting.creating')}</>
                ) : (
                  <><Search className="mr-2 h-4 w-4" /> {t('prospecting.createTask')}</>
=======
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
>>>>>>> feat/landing-page
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
                          <th className="p-2">来源</th>
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
                            <td className="p-2 text-xs text-gray-500">
                              {(p.sources || (p.source ? [p.source] : [])).join(', ') || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-gray-100">
              <CardHeader>
                <CardTitle className="text-base">{t('prospecting.tips.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
<<<<<<< HEAD
                <p>💡 {t('prospecting.tips.tip1')}</p>
                <p>💡 {t('prospecting.tips.tip2')}</p>
                <p>💡 {t('prospecting.tips.tip3')}</p>
                <p>💡 {t('prospecting.tips.tip4')}</p>
=======
                <p>💡 使用英文关键词搜索，结果更准确</p>
                <p>💡 职位使用英文标准名称，如 CTO、VP of Sales</p>
                <p>💡 地区使用国家英文名，如 United States、Germany</p>
                <p>💡 勾选结果后点击「导入选中」写入公司/联系人库</p>
>>>>>>> feat/landing-page
              </CardContent>
            </Card>

            <Card className="border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900">{t('prospecting.emailSolutions')}</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    {t('prospecting.solutions.api')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" />
                    {t('prospecting.solutions.ai')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {t('prospecting.solutions.scraper')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    {t('prospecting.solutions.verify')}
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
