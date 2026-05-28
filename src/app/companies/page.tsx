'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import {
  Building2, Search, Plus, Edit, Trash2, X, Loader2, Globe, Users, ExternalLink
} from 'lucide-react'

interface Company {
  id: string
  name: string
  domain: string
  website: string
  industry: string
  size: string
  country: string
  countryCode: string
  city: string
  region: string
  linkedinUrl: string
  tags: string[]
  description: string
  createdAt: string
}

export default function CompaniesPage() {
  const { addToast } = useToast()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showDialog, setShowDialog] = useState(false)
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    domain: '',
    website: '',
    industry: '',
    size: '',
    country: '',
    city: '',
    linkedinUrl: '',
    description: '',
  })

  useEffect(() => {
    fetchCompanies()
  }, [page, search])

  async function fetchCompanies() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/companies?${params}`)
      const data = await res.json()
      if (data.success) {
        setCompanies(data.data)
        setTotal(data.pagination.total)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({ name: '', domain: '', website: '', industry: '', size: '', country: '', city: '', linkedinUrl: '', description: '' })
  }

  const openAddDialog = () => {
    resetForm()
    setCurrentCompany(null)
    setShowDialog(true)
  }

  const openEditDialog = (company: Company) => {
    setCurrentCompany(company)
    setForm({
      name: company.name || '',
      domain: company.domain || '',
      website: company.website || '',
      industry: company.industry || '',
      size: company.size || '',
      country: company.country || '',
      city: company.city || '',
      linkedinUrl: company.linkedinUrl || '',
      description: company.description || '',
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!form.name) {
      addToast({ type: 'error', title: '请填写公司名称' })
      return
    }

    setSaving(true)
    try {
      const url = currentCompany ? `/api/companies/${currentCompany.id}` : '/api/companies'
      const method = currentCompany ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', title: currentCompany ? '更新成功' : '创建成功' })
        setShowDialog(false)
        fetchCompanies()
      } else {
        addToast({ type: 'error', title: '操作失败', description: data.error })
      }
    } catch (e) {
      addToast({ type: 'error', title: '操作失败' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此公司吗？关联的客户不会被删除。')) return

    try {
      const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', title: '删除成功' })
        fetchCompanies()
      }
    } catch (e) {
      addToast({ type: 'error', title: '删除失败' })
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">公司库</h1>
            <p className="text-sm text-gray-500">管理和搜索全球公司信息</p>
          </div>
          <Button className="gap-2" onClick={openAddDialog}>
            <Plus className="h-4 w-4" /> 添加公司
          </Button>
        </div>

        {/* Search */}
        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="搜索公司名称、域名、网站..."
                className="pl-10"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Companies Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-gray-100">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : companies.length === 0 ? (
          <Card className="border-gray-100">
            <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Building2 className="mb-4 h-16 w-16 text-gray-300" />
              <p className="text-lg font-medium">暂无公司数据</p>
              <p className="text-sm mt-1">请先创建拓客任务，或手动添加公司</p>
              <Button className="mt-4 gap-2" onClick={openAddDialog}>
                <Plus className="h-4 w-4" /> 添加公司
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <Card key={company.id} className="border-gray-100 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{company.name}</h3>
                        {company.domain && (
                          <a
                            href={`https://${company.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <Globe className="h-3 w-3" /> {company.domain}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    {company.industry && (
                      <p className="flex items-center gap-2">
                        <span className="text-gray-400">行业：</span> {company.industry}
                      </p>
                    )}
                    {company.size && (
                      <p className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-gray-400" /> {company.size} 人
                      </p>
                    )}
                    {(company.country || company.city) && (
                      <p className="flex items-center gap-2">
                        <span className="text-gray-400">📍</span>
                        {[company.city, company.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  {company.tags && company.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {company.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <span className="text-xs text-gray-400">
                      {new Date(company.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                    <div className="flex gap-1">
                      {company.linkedinUrl && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={company.linkedinUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(company)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(company.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              上一页
            </Button>
            <span className="flex items-center px-3 text-sm text-gray-500">
              第 {page} 页，共 {Math.ceil(total / 20)} 页
            </span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>
              下一页
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{currentCompany ? '编辑公司' : '添加公司'}</h2>
              <button onClick={() => setShowDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>公司名称 *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="公司名称"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>域名</Label>
                  <Input
                    value={form.domain}
                    onChange={(e) => setForm({ ...form, domain: e.target.value })}
                    placeholder="example.com"
                  />
                </div>
                <div>
                  <Label>网站</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>行业</Label>
                  <Input
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    placeholder="如：Technology, Manufacturing"
                  />
                </div>
                <div>
                  <Label>公司规模</Label>
                  <select
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">请选择</option>
                    <option value="1-10">1-10人</option>
                    <option value="11-50">11-50人</option>
                    <option value="51-200">51-200人</option>
                    <option value="201-500">201-500人</option>
                    <option value="501-1000">501-1000人</option>
                    <option value="1000+">1000+人</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>国家</Label>
                  <Input
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="United States"
                  />
                </div>
                <div>
                  <Label>城市</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="San Francisco"
                  />
                </div>
              </div>
              <div>
                <Label>LinkedIn</Label>
                <Input
                  value={form.linkedinUrl}
                  onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/company/..."
                />
              </div>
              <div>
                <Label>公司描述</Label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="公司简介..."
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {currentCompany ? '保存修改' : '添加公司'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
