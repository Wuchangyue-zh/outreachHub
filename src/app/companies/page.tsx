'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/hooks/use-i18n'
import {
  Building2, Search, Plus, Edit, Trash2, X, Loader2, Globe, Users, ExternalLink, Mail
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

interface FoundEmail {
  email: string
  firstName?: string
  lastName?: string
  position?: string
  confidence?: number
  source: 'hunter' | 'pattern-guess'
}

export default function CompaniesPage() {
  const { addToast } = useToast()
  const { t } = useI18n()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showDialog, setShowDialog] = useState(false)
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null)
  const [saving, setSaving] = useState(false)
  const [findingEmailsId, setFindingEmailsId] = useState<string | null>(null)
  const [emailDialogCompany, setEmailDialogCompany] = useState<Company | null>(null)
  const [foundEmails, setFoundEmails] = useState<FoundEmail[]>([])
  const [emailSearchMessage, setEmailSearchMessage] = useState('')

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
      } else {
        addToast({ type: 'error', title: '加载失败', description: data.error?.message || '无法加载公司列表' })
      }
<<<<<<< HEAD
    } catch (e) {
      console.error(e)
      addToast({ type: 'error', title: t('common.loadFailed') })
=======
    } catch {
      addToast({ type: 'error', title: '加载失败', description: '无法加载公司列表，请稍后重试' })
>>>>>>> feat/landing-page
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
      addToast({ type: 'error', title: t('companies.fillName') })
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
        addToast({ type: 'success', title: currentCompany ? t('companies.updateSuccess') : t('companies.createSuccess') })
        setShowDialog(false)
        fetchCompanies()
      } else {
        addToast({ type: 'error', title: t('common.operationFailed'), description: data.error })
      }
    } catch (e) {
      addToast({ type: 'error', title: t('common.operationFailed') })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('companies.confirmDelete'))) return

    try {
      const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', title: t('common.deleteSuccess') })
        fetchCompanies()
      }
    } catch (e) {
      addToast({ type: 'error', title: t('common.deleteFailed') })
    }
  }

  const handleFindEmails = async (company: Company) => {
    if (!company.domain && !company.website) {
      addToast({ type: 'warning', title: '无法搜索', description: '请先填写公司域名或网站' })
      return
    }
    setFindingEmailsId(company.id)
    setEmailDialogCompany(company)
    setFoundEmails([])
    setEmailSearchMessage('')
    try {
      const res = await fetch(`/api/companies/${company.id}/find-emails`)
      const data = await res.json()
      if (data.success) {
        setFoundEmails(data.data.emails || [])
        setEmailSearchMessage(data.data.message || '')
        if (!data.data.mxValid) {
          addToast({ type: 'warning', title: 'MX 无效', description: data.data.message })
        }
      } else {
        addToast({ type: 'error', title: '搜索失败', description: data.error?.message || data.message })
        setEmailDialogCompany(null)
      }
    } catch {
      addToast({ type: 'error', title: '搜索失败', description: '网络错误' })
      setEmailDialogCompany(null)
    } finally {
      setFindingEmailsId(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('companies.title')}</h1>
            <p className="text-sm text-gray-500">{t('companies.subtitle')}</p>
          </div>
          <Button className="gap-2" onClick={openAddDialog}>
            <Plus className="h-4 w-4" /> {t('companies.addCompany')}
          </Button>
        </div>

        {/* Search */}
        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={t('companies.searchPlaceholder')}
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
              <p className="text-lg font-medium">{t('companies.noData')}</p>
              <p className="text-sm mt-1">{t('companies.noDataHint')}</p>
              <Button className="mt-4 gap-2" onClick={openAddDialog}>
                <Plus className="h-4 w-4" /> {t('companies.addCompany')}
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
                        <span className="text-gray-400">{t('companies.industry')}：</span> {company.industry}
                      </p>
                    )}
                    {company.size && (
                      <p className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-gray-400" /> {company.size} {t('companies.people')}
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
                      {(company.domain || company.website) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="查找邮箱"
                          disabled={findingEmailsId === company.id}
                          onClick={() => handleFindEmails(company)}
                        >
                          {findingEmailsId === company.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                        </Button>
                      )}
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
              {t('common.prevPage')}
            </Button>
            <span className="flex items-center px-3 text-sm text-gray-500">
              {t('common.pagination').replace('{page}', page.toString()).replace('{total}', Math.ceil(total / 20).toString())}
            </span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>
              {t('common.nextPage')}
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{currentCompany ? t('companies.editCompany') : t('companies.addCompany')}</h2>
              <button onClick={() => setShowDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>{t('companies.form.name')} *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t('companies.form.namePlaceholder')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('companies.form.domain')}</Label>
                  <Input
                    value={form.domain}
                    onChange={(e) => setForm({ ...form, domain: e.target.value })}
                    placeholder="example.com"
                  />
                </div>
                <div>
                  <Label>{t('companies.form.website')}</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('companies.form.industry')}</Label>
                  <Input
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    placeholder={t('companies.form.industryPlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('companies.form.size')}</Label>
                  <select
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">{t('companies.form.sizePlaceholder')}</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201-500">201-500</option>
                    <option value="501-1000">501-1000</option>
                    <option value="1000+">1000+</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('companies.form.country')}</Label>
                  <Input
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="United States"
                  />
                </div>
                <div>
                  <Label>{t('companies.form.city')}</Label>
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
                <Label>{t('companies.form.description')}</Label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={t('companies.form.descriptionPlaceholder')}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {currentCompany ? t('common.save') : t('companies.addCompany')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {emailDialogCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold">邮箱搜索结果</h2>
                <p className="text-sm text-gray-500">{emailDialogCompany.name}</p>
              </div>
              <button
                onClick={() => setEmailDialogCompany(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {emailSearchMessage && (
                <p className="text-sm text-gray-600">{emailSearchMessage}</p>
              )}
              {foundEmails.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">未找到邮箱</p>
              ) : (
                <div className="space-y-2">
                  {foundEmails.map((hit) => (
                    <div
                      key={hit.email}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{hit.email}</p>
                        <p className="text-xs text-gray-500">
                          {[hit.firstName, hit.lastName].filter(Boolean).join(' ')}
                          {hit.position ? ` · ${hit.position}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {hit.source === 'hunter' ? 'Hunter' : '格式推测'}
                        {hit.confidence ? ` · ${hit.confidence}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end p-6 border-t">
              <Button variant="outline" onClick={() => setEmailDialogCompany(null)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
