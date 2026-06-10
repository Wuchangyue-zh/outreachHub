'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
<<<<<<< HEAD
import { useI18n } from '@/hooks/use-i18n'
=======
import { SearchableSelect, type SearchableOption } from '@/components/ui/searchable-select'
>>>>>>> feat/landing-page
import { CSVImport } from '@/components/CSVImport'
import {
  Users, Plus, Download, Upload, Search, Mail, Building, Tag,
  ChevronRight, Edit, Trash2, X, Loader2, UserPlus, Send, Check,
  Eye, MousePointer, MessageSquare, AlertCircle, ShieldCheck,
  Hand, RefreshCw, Briefcase, ListTodo, Calendar, Clock,
} from 'lucide-react'

interface TimelineEvent {
  id: string
  type: 'sent' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed'
  timestamp: string
  campaign?: { id: string; name: string }
  details: {
    subject?: string
    replyCategory?: string
    error?: string
  }
}

interface TimelineSummary {
  totalEmailsSent: number
  totalOpened: number
  totalReplied: number
}

interface Deal {
  id: string
  name: string
  stage: string
  amount: number | null
  currency: string
  expectedCloseDate: string | null
  probability: number | null
  createdAt: string
}

interface ContactTask {
  id: string
  name: string
  type: string
  status: string
  dueDate: string | null
  createdAt: string
}

interface ContactEmail {
  id: string
  address: string
  isPrimary: boolean
  isVerified: boolean
}

interface Contact {
  id: string
  firstName: string
  lastName: string
  fullName: string
  title: string
  department: string
  emails: ContactEmail[]
  company: { name: string; domain: string } | null
  companyId: string | null
  countryCode: string
  country: string
  city: string
  tags: string[]
  status: string
  notes: string
  pool: string
  ownerId: string | null
  ownerName: string | null
  createdAt: string
  updatedAt: string
}

export default function ContactsPage() {
  const { addToast } = useToast()
  const { t } = useI18n()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [verifying, setVerifying] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDetailDrawer, setShowDetailDrawer] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [currentContact, setCurrentContact] = useState<Contact | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [timelineSummary, setTimelineSummary] = useState<TimelineSummary | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineError, setTimelineError] = useState(false)
  const [deals, setDeals] = useState<Deal[]>([])
  const [dealsLoading, setDealsLoading] = useState(false)
  const [deals360Error, setDeals360Error] = useState(false)
  const [contactTasks, setContactTasks] = useState<ContactTask[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [customsProfile, setCustomsProfile] = useState<{
    companyName: string
    purchaseIntentScore?: number | null
    totalShipments?: number
    totalAmountUsd?: number
    aiSummary?: string | null
  } | null>(null)
  const [drawerTab, setDrawerTab] = useState<'timeline' | 'deals' | 'tasks' | 'customs'>('timeline')
  const [claimingContact, setClaimingContact] = useState(false)
  const [releasingContact, setReleasingContact] = useState(false)
  const [saving, setSaving] = useState(false)
  const limit = 20

  // Form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    title: '',
    department: '',
    companyId: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    tags: '',
    notes: '',
  })
  const [editCompanyLabel, setEditCompanyLabel] = useState('')
  const [showQuickCompany, setShowQuickCompany] = useState(false)
  const [quickCompanyName, setQuickCompanyName] = useState('')
  const [quickCompanyDomain, setQuickCompanyDomain] = useState('')

  const fetchCompanyOptions = useCallback(async (query: string): Promise<SearchableOption[]> => {
    const params = new URLSearchParams({ limit: '20' })
    if (query) params.set('search', query)
    const res = await fetch(`/api/companies?${params}`)
    const data = await res.json()
    if (!data.success) return []
    return (data.data || []).map((c: { id: string; name: string; domain?: string }) => ({
      id: c.id,
      label: c.name,
      sublabel: c.domain || undefined,
    }))
  }, [])

  useEffect(() => {
    fetchContacts()
  }, [page, search])

  async function fetchContacts() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      const res = await fetch(`/api/contacts?${params}`)
      const data = await res.json()
      if (data.success) {
        setContacts(data.data)
        setTotal(data.pagination.total)
      }
    } catch (e) {
      console.error(e)
      addToast({ type: 'error', title: t('common.loadFailed'), description: t('contacts.loadFailedDesc') })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      firstName: '', lastName: '', title: '', department: '',
      companyId: '', email: '', phone: '', country: '', city: '', tags: '', notes: '',
    })
    setEditCompanyLabel('')
  }

  const openAddDialog = () => {
    resetForm()
    setShowAddDialog(true)
  }

  const openEditDialog = (contact: Contact) => {
    setCurrentContact(contact)
    setForm({
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      title: contact.title || '',
      department: contact.department || '',
      companyId: contact.companyId || '',
      email: contact.emails[0]?.address || '',
      phone: '',
      country: contact.country || '',
      city: contact.city || '',
      tags: contact.tags.join(', '),
      notes: contact.notes || '',
    })
    setEditCompanyLabel(contact.company?.name || '')
    setShowEditDialog(true)
  }

  const openDetailDrawer = async (contact: Contact) => {
    setCurrentContact(contact)
    setShowDetailDrawer(true)
    setDrawerTab('timeline')
    setTimelineEvents([])
    setTimelineSummary(null)
    setDeals([])
    setContactTasks([])
    setCustomsProfile(null)
    setTimelineError(false)
    setDeals360Error(false)
    setTimelineLoading(true)
    setDealsLoading(true)
    setTasksLoading(true)

    try {
      const [res360, resTimeline] = await Promise.all([
        fetch(`/api/contacts/${contact.id}/360`),
        fetch(`/api/contacts/${contact.id}/timeline`),
      ])
      const [data360, dataTimeline] = await Promise.all([res360.json(), resTimeline.json()])

      let loadFailed = false

      if (dataTimeline.success) {
        setTimelineEvents(dataTimeline.data.timeline || [])
        setTimelineSummary(dataTimeline.data.summary || null)
      } else {
        setTimelineEvents([])
        setTimelineSummary(null)
        setTimelineError(true)
        loadFailed = true
      }

      if (data360.success) {
        setDeals(data360.data.deals || [])
        setContactTasks(data360.data.tasks || [])
        if (data360.data.customsProfile) {
          setCustomsProfile(data360.data.customsProfile)
        }
        if (data360.data.contact) {
          setCurrentContact((prev) =>
            prev
              ? {
                  ...prev,
                  pool: data360.data.contact.pool ?? prev.pool,
                  ownerId: data360.data.contact.ownerId ?? prev.ownerId,
                }
              : prev
          )
        }
      } else {
        setDeals([])
        setContactTasks([])
        setDeals360Error(true)
        loadFailed = true
      }

      if (loadFailed) {
        addToast({ type: 'error', title: '加载失败', description: '无法加载联系人详情，请稍后重试' })
      }
    } catch (e) {
      setTimelineEvents([])
      setTimelineSummary(null)
      setDeals([])
      setContactTasks([])
      setCustomsProfile(null)
      setTimelineError(true)
      setDeals360Error(true)
      addToast({ type: 'error', title: '加载失败', description: '无法加载联系人详情，请稍后重试' })
    } finally {
      setTimelineLoading(false)
      setDealsLoading(false)
      setTasksLoading(false)
    }
  }

  const handleClaimContact = async () => {
    if (!currentContact) return
    setClaimingContact(true)
    try {
      const res = await fetch(`/api/contacts/${currentContact.id}/claim`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', title: '领取成功', description: '客户已移入您的列表' })
        setCurrentContact({
          ...currentContact,
          pool: 'PRIVATE',
          ownerId: data.data.ownerId || currentContact.ownerId,
        })
        fetchContacts()
      } else {
        addToast({ type: 'error', title: '领取失败', description: data.error?.message || data.message })
      }
    } catch {
      addToast({ type: 'error', title: '领取失败', description: '网络错误' })
    } finally {
      setClaimingContact(false)
    }
  }

  const handleReleaseContact = async () => {
    if (!currentContact) return
    setReleasingContact(true)
    try {
      const res = await fetch(`/api/contacts/${currentContact.id}/release`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', title: '释放成功', description: '客户已释放回公海' })
        setCurrentContact({ ...currentContact, pool: 'PUBLIC', ownerId: null })
        fetchContacts()
      } else {
        addToast({ type: 'error', title: '释放失败', description: data.error?.message || data.message })
      }
    } catch {
      addToast({ type: 'error', title: '释放失败', description: '网络错误' })
    } finally {
      setReleasingContact(false)
    }
  }

  const confirmDelete = (contact: Contact) => {
    setCurrentContact(contact)
    setShowDeleteDialog(true)
  }

  const handleSave = async (isEdit: boolean) => {
    if (!form.firstName || !form.email) {
      addToast({ type: 'error', title: t('common.fillRequired'), description: t('contacts.nameEmailRequired') })
      return
    }

    setSaving(true)
    try {
      const url = isEdit ? `/api/contacts/${currentContact?.id}` : '/api/contacts'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          title: form.title,
          department: form.department,
          companyId: form.companyId || null,
          emails: [form.email],
          phones: form.phone ? [form.phone] : [],
          country: form.country,
          city: form.city,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          notes: form.notes,
        }),
      })

      const data = await res.json()
      if (data.success) {
        addToast({
          type: 'success',
          title: isEdit ? t('contacts.updateSuccess') : t('contacts.createSuccess'),
          description: isEdit ? t('contacts.updateSuccess') : t('contacts.createSuccess')
        })
        setShowAddDialog(false)
        setShowEditDialog(false)
        fetchContacts()
      } else {
        addToast({ type: 'error', title: t('common.operationFailed'), description: data.error })
      }
    } catch (e) {
      addToast({ type: 'error', title: t('common.operationFailed'), description: t('common.networkError') })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!currentContact) return

    setSaving(true)
    try {
      const res = await fetch(`/api/contacts/${currentContact.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        addToast({ type: 'success', title: t('contacts.deleteSuccess') })
        setShowDeleteDialog(false)
        setCurrentContact(null)
        fetchContacts()
      } else {
        addToast({ type: 'error', title: t('common.deleteFailed'), description: data.error })
      }
    } catch (e) {
      addToast({ type: 'error', title: t('common.deleteFailed'), description: t('common.networkError') })
    } finally {
      setSaving(false)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      addToast({ type: 'warning', title: t('contacts.selectContacts'), description: t('contacts.selectDeleteHint') })
      return
    }

    setSaving(true)
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      )
      await Promise.all(promises)
      addToast({ type: 'success', title: t('contacts.batchDeleteSuccess') })
      setSelectedIds(new Set())
      fetchContacts()
    } catch (e) {
      addToast({ type: 'error', title: t('contacts.batchDeleteFailed') })
    } finally {
      setSaving(false)
    }
  }

  const handleBatchVerify = async () => {
    if (selectedIds.size === 0) {
      addToast({ type: 'warning', title: '请选择客户', description: '请先选择要验证的客户' })
      return
    }
    if (selectedIds.size > 100) {
      addToast({ type: 'warning', title: '超出限制', description: '单次最多验证 100 个联系人' })
      return
    }

    setVerifying(true)
    try {
      const res = await fetch('/api/contacts/verify-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (data.success) {
        const { valid, invalid, total } = data.data
        addToast({
          type: 'success',
          title: '批量验证完成',
          description: `共 ${total} 个邮箱：有效 ${valid}，无效 ${invalid}`,
        })
        fetchContacts()
      } else {
        addToast({ type: 'error', title: '验证失败', description: data.error?.message || data.message })
      }
    } catch {
      addToast({ type: 'error', title: '验证失败', description: '网络错误' })
    } finally {
      setVerifying(false)
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)))
    }
  }

  const handleExport = async () => {
    addToast({ type: 'info', title: t('contacts.exporting'), description: t('contacts.preparingExport') })
    const csv = [
      [t('contacts.export.headers.name'), t('contacts.export.headers.title'), t('contacts.export.headers.company'), t('contacts.export.headers.email'), t('contacts.export.headers.country'), t('contacts.export.headers.city'), t('contacts.export.headers.tags'), t('contacts.export.headers.status')].join(','),
      ...contacts.map(c => [
        c.fullName,
        c.title || '',
        c.company?.name || '',
        c.emails[0]?.address || '',
        c.country || '',
        c.city || '',
        c.tags.join(';'),
        c.status
      ].map(v => `"${v}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${t('contacts.export.filename')}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    addToast({ type: 'success', title: t('common.exportSuccess') })
  }

  const handleExportContactGdpr = async (contactId: string, contactName: string) => {
    addToast({ type: 'info', title: '导出中...', description: '正在准备 GDPR 数据包' })
    try {
      const res = await fetch(`/api/contacts/${contactId}/export`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        addToast({ type: 'error', title: '导出失败', description: data?.error?.message || data?.error || '请求失败' })
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contact-${contactId}-export.json`
      a.click()
      URL.revokeObjectURL(url)
      addToast({ type: 'success', title: '导出成功', description: `${contactName} 的数据已下载` })
    } catch {
      addToast({ type: 'error', title: '导出失败', description: '网络错误' })
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('contacts.title')}</h1>
            <p className="text-sm text-gray-500">{t('contacts.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4" /> {t('contacts.importContacts')}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" /> {t('contacts.exportContacts')}
            </Button>
            <Button className="gap-2" onClick={openAddDialog}>
              <UserPlus className="h-4 w-4" /> {t('contacts.addContact')}
            </Button>
          </div>
        </div>

        {/* Filters & Batch Actions */}
        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder={t('contacts.searchPlaceholder')}
                  className="pl-10"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{t('contacts.selectedCount').replace('{n}', selectedIds.size.toString())}</span>
                  <Button variant="destructive" size="sm" onClick={handleBatchDelete} disabled={saving}>
                    <Trash2 className="h-4 w-4 mr-1" /> {t('contacts.batchDelete')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBatchVerify} disabled={verifying || saving}>
                    {verifying ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 mr-1" />
                    )}
                    批量验证邮箱
                  </Button>
                  <Button variant="outline" size="sm">
                    <Send className="h-4 w-4 mr-1" /> {t('contacts.batchSendEmail')}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contacts table */}
        <Card className="border-gray-100">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={contacts.length > 0 && selectedIds.size === contacts.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">{t('contacts.tableHeaders.name')}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">{t('contacts.tableHeaders.company')}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">{t('contacts.tableHeaders.email')}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">{t('contacts.tableHeaders.location')}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">{t('contacts.tableHeaders.tags')}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">{t('contacts.tableHeaders.status')}</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-4 py-3"><div className="h-4 w-4 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-40 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></td>
                        <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse ml-auto" /></td>
                      </tr>
                    ))
                  ) : contacts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <p className="text-gray-500 font-medium">{t('contacts.noData')}</p>
                        <p className="text-sm text-gray-400 mt-1">{t('contacts.noDataHint')}</p>
                      </td>
                    </tr>
                  ) : (
                    contacts.map((contact) => (
                      <tr key={contact.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={selectedIds.has(contact.id)}
                            onChange={() => toggleSelect(contact.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openDetailDrawer(contact)}
                            className="flex items-center gap-3 hover:text-primary"
                          >
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                              {contact.fullName.charAt(0)}
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-gray-900">{contact.fullName}</p>
                              <p className="text-xs text-gray-500">{contact.title || '-'}</p>
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Building className="h-3.5 w-3.5 text-gray-400" />
                            {contact.company?.name || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate max-w-[200px]">
                              {contact.emails.find(e => e.isPrimary)?.address || contact.emails[0]?.address || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {contact.country ? `${contact.country}${contact.city ? ', ' + contact.city : ''}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {contact.tags.slice(0, 2).map((tag, i) => (
                              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                {tag}
                              </span>
                            ))}
                            {contact.tags.length > 2 && (
                              <span className="text-xs text-gray-400">+{contact.tags.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={contact.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(contact)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => confirmDelete(contact)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-gray-500">{t('common.totalRecords').replace('{n}', total.toString())}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    {t('common.prevPage')}
                  </Button>
                  {Array.from({ length: Math.min(5, Math.ceil(total / limit)) }, (_, i) => (
                    <Button
                      key={i}
                      variant={page === i + 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>
                    {t('common.nextPage')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      {(showAddDialog || showEditDialog) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{showEditDialog ? t('contacts.editContact') : t('contacts.addContact')}</h2>
              <button onClick={() => { setShowAddDialog(false); setShowEditDialog(false) }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('contacts.form.firstName')} *</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder={t('contacts.form.firstNamePlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('contacts.form.lastName')}</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder={t('contacts.form.lastNamePlaceholder')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('contacts.form.jobTitle')}</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={t('contacts.form.jobTitlePlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('contacts.form.department')}</Label>
                  <Input
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder={t('contacts.form.departmentPlaceholder')}
                  />
                </div>
              </div>
              <div>
                <Label>{t('contacts.form.email')} *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@company.com"
                />
              </div>
              <div>
<<<<<<< HEAD
                <Label>{t('contacts.form.company')}</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder={t('contacts.form.companyPlaceholder')}
=======
                <Label>公司</Label>
                <SearchableSelect
                  value={form.companyId}
                  onChange={(id) => setForm({ ...form, companyId: id })}
                  onClear={() => setForm({ ...form, companyId: '' })}
                  onQuickCreate={() => {
                    setQuickCompanyName('')
                    setQuickCompanyDomain('')
                    setShowQuickCompany(true)
                  }}
                  fetchOptions={fetchCompanyOptions}
                  placeholder="搜索公司..."
                  quickCreateLabel="新建公司"
                  initialLabel={editCompanyLabel}
>>>>>>> feat/landing-page
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('contacts.form.country')}</Label>
                  <Input
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="United States"
                  />
                </div>
                <div>
                  <Label>{t('contacts.form.city')}</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="San Francisco"
                  />
                </div>
              </div>
              <div>
                <Label>{t('contacts.form.tags')}</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder={t('contacts.form.tagsPlaceholder')}
                />
              </div>
              <div>
                <Label>{t('common.notes')}</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={t('contacts.form.notesPlaceholder')}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => { setShowAddDialog(false); setShowEditDialog(false) }}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => handleSave(showEditDialog)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {showEditDialog ? t('common.save') : t('contacts.addContact')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && currentContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{t('common.confirmDelete')}</h3>
                  <p className="text-sm text-gray-500">{t('common.irreversible')}</p>
                </div>
              </div>
              <p className="text-gray-600">
                {t('contacts.deleteConfirm').replace('{name}', currentContact.fullName)}
              </p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>{t('common.cancel')}</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {t('common.confirmDelete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick-create Company Dialog */}
      {showQuickCompany && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">快速新建公司</h3>
              <div className="space-y-3">
                <div>
                  <Label>公司名称 *</Label>
                  <Input
                    value={quickCompanyName}
                    onChange={(e) => setQuickCompanyName(e.target.value)}
                    placeholder="ABC 科技有限公司"
                    autoFocus
                  />
                </div>
                <div>
                  <Label>域名</Label>
                  <Input
                    value={quickCompanyDomain}
                    onChange={(e) => setQuickCompanyDomain(e.target.value)}
                    placeholder="example.com"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowQuickCompany(false)}>取消</Button>
                <Button
                  onClick={async () => {
                    if (!quickCompanyName.trim()) {
                      addToast({ type: 'error', title: '请输入公司名称' })
                      return
                    }
                    try {
                      const res = await fetch('/api/companies', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: quickCompanyName.trim(),
                          domain: quickCompanyDomain.trim() || undefined,
                        }),
                      })
                      const data = await res.json()
                      if (data.success) {
                        setForm((prev) => ({ ...prev, companyId: data.data.id }))
                        setEditCompanyLabel(data.data.name)
                        setShowQuickCompany(false)
                        addToast({ type: 'success', title: '公司已创建' })
                      } else {
                        addToast({ type: 'error', title: data.error?.message || '创建失败' })
                      }
                    } catch {
                      addToast({ type: 'error', title: '创建公司失败' })
                    }
                  }}
                >
                  创建
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {showDetailDrawer && currentContact && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowDetailDrawer(false)} />
          <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
<<<<<<< HEAD
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('contacts.detail')}</h2>
=======
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">客户详情</h2>
>>>>>>> feat/landing-page
              <button onClick={() => setShowDetailDrawer(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Profile */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {currentContact.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{currentContact.fullName}</h3>
                  <p className="text-gray-500">{currentContact.title || t('contacts.noTitle')}</p>
                </div>
              </div>

<<<<<<< HEAD
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{t('common.statusLabel')}</span>
=======
              {/* Status + Pool Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-500">状态：</span>
>>>>>>> feat/landing-page
                <StatusBadge status={currentContact.status} />
                {currentContact.pool === 'PUBLIC' && (
                  <Button size="sm" className="ml-auto gap-1" onClick={handleClaimContact} disabled={claimingContact}>
                    {claimingContact ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Hand className="h-3.5 w-3.5" />}
                    领取
                  </Button>
                )}
                {currentContact.pool === 'PRIVATE' && currentContact.ownerId && (
                  <Button size="sm" variant="outline" className="ml-auto gap-1" onClick={handleReleaseContact} disabled={releasingContact}>
                    {releasingContact ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    释放
                  </Button>
                )}
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">{t('contacts.contactInfo')}</h4>
                {currentContact.emails.map((email, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{email.address}</span>
                    {email.isVerified && <Check className="h-3 w-3 text-green-500" />}
                    {email.isPrimary && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{t('contacts.primary')}</span>}
                  </div>
                ))}
              </div>

              {/* Company */}
              {currentContact.company && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">{t('contacts.companyInfo')}</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span>{currentContact.company.name}</span>
                  </div>
                </div>
              )}

              {/* Location */}
              {(currentContact.country || currentContact.city) && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">{t('contacts.location')}</h4>
                  <p className="text-sm text-gray-600">
                    {[currentContact.city, currentContact.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {/* Tags */}
              {currentContact.tags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">{t('common.tags')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentContact.tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {currentContact.notes && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">{t('common.notes')}</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{currentContact.notes}</p>
                </div>
              )}

              {/* 360 Tabs */}
              <div className="space-y-3">
                <div className="flex border-b border-gray-200">
                  <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      drawerTab === 'timeline'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setDrawerTab('timeline')}
                  >
                    时间线
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      drawerTab === 'deals'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setDrawerTab('deals')}
                  >
                    商机
                    {deals.length > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 text-xs text-gray-700">
                        {deals.length}
                      </span>
                    )}
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      drawerTab === 'tasks'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setDrawerTab('tasks')}
                  >
                    任务
                    {contactTasks.length > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 text-xs text-gray-700">
                        {contactTasks.length}
                      </span>
                    )}
                  </button>
                  {customsProfile && (
                    <button
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        drawerTab === 'customs'
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setDrawerTab('customs')}
                    >
                      海关
                    </button>
                  )}
                </div>

                {/* Timeline Tab */}
                {drawerTab === 'timeline' && (
                  <div className="space-y-3">
                    {timelineSummary && (
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-lg bg-blue-50 p-2">
                          <p className="font-semibold text-blue-700">{timelineSummary.totalEmailsSent}</p>
                          <p className="text-gray-500">已发送</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 p-2">
                          <p className="font-semibold text-emerald-700">{timelineSummary.totalOpened}</p>
                          <p className="text-gray-500">已打开</p>
                        </div>
                        <div className="rounded-lg bg-violet-50 p-2">
                          <p className="font-semibold text-violet-700">{timelineSummary.totalReplied}</p>
                          <p className="text-gray-500">已回复</p>
                        </div>
                      </div>
                    )}
                    {timelineLoading ? (
                      <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载中...
                      </div>
                    ) : timelineError ? (
                      <p className="text-sm text-red-500 py-4 text-center">加载失败，请稍后重试</p>
                    ) : timelineEvents.length === 0 ? (
                      <p className="text-sm text-gray-400 py-4 text-center">暂无邮件互动记录</p>
                    ) : (
                      <ul className="space-y-2 max-h-64 overflow-y-auto">
                        {timelineEvents.map((ev) => {
                          const iconMap = {
                            sent: { icon: Send, color: 'text-blue-600 bg-blue-50' },
                            opened: { icon: Eye, color: 'text-emerald-600 bg-emerald-50' },
                            clicked: { icon: MousePointer, color: 'text-amber-600 bg-amber-50' },
                            replied: { icon: MessageSquare, color: 'text-violet-600 bg-violet-50' },
                            bounced: { icon: AlertCircle, color: 'text-orange-600 bg-orange-50' },
                            failed: { icon: AlertCircle, color: 'text-red-600 bg-red-50' },
                          }
                          const labelMap: Record<string, string> = {
                            sent: '发送邮件',
                            opened: '打开邮件',
                            clicked: '点击链接',
                            replied: '收到回复',
                            bounced: '退信',
                            failed: '发送失败',
                          }
                          const cfg = iconMap[ev.type]
                          const Icon = cfg.icon
                          return (
                            <li key={ev.id} className="flex gap-3 rounded-lg border border-gray-100 p-3">
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.color}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900">{labelMap[ev.type]}</p>
                                {ev.details.subject && (
                                  <p className="truncate text-xs text-gray-500">{ev.details.subject}</p>
                                )}
                                {ev.campaign && (
                                  <p className="text-xs text-gray-400">活动：{ev.campaign.name}</p>
                                )}
                                <p className="text-xs text-gray-400">
                                  {new Date(ev.timestamp).toLocaleString('zh-CN')}
                                </p>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {/* Deals Tab */}
                {drawerTab === 'deals' && (
                  <div className="space-y-3">
                    {dealsLoading ? (
                      <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载中...
                      </div>
                    ) : deals360Error ? (
                      <div className="py-6 text-center">
                        <Briefcase className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-sm text-red-500">加载失败，请稍后重试</p>
                      </div>
                    ) : deals.length === 0 ? (
                      <div className="py-6 text-center">
                        <Briefcase className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">暂无商机记录</p>
                      </div>
                    ) : (
                      <ul className="space-y-2 max-h-64 overflow-y-auto">
                        {deals.map((deal) => (
                          <li key={deal.id} className="rounded-lg border border-gray-100 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900">{deal.name}</p>
                              <DealStageBadge stage={deal.stage} />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              {deal.amount !== null && (
                                <span className="font-medium text-gray-700">
                                  {deal.currency} {deal.amount.toLocaleString()}
                                </span>
                              )}
                              {deal.probability !== null && (
                                <span>概率 {deal.probability}%</span>
                              )}
                              {deal.expectedCloseDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  预计 {new Date(deal.expectedCloseDate).toLocaleDateString('zh-CN')}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Tasks Tab */}
                {drawerTab === 'tasks' && (
                  <div className="space-y-3">
                    {tasksLoading ? (
                      <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载中...
                      </div>
                    ) : deals360Error ? (
                      <div className="py-6 text-center">
                        <ListTodo className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-sm text-red-500">加载失败，请稍后重试</p>
                      </div>
                    ) : contactTasks.length === 0 ? (
                      <div className="py-6 text-center">
                        <ListTodo className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">暂无关联任务</p>
                      </div>
                    ) : (
                      <ul className="space-y-2 max-h-64 overflow-y-auto">
                        {contactTasks.map((task) => {
                          const taskTypeLabels: Record<string, string> = {
                            OUTREACH: '拓客',
                            FOLLOW_UP: '跟进',
                            NURTURE: '培育',
                          }
                          const taskStatusConfig: Record<string, { label: string; color: string }> = {
                            DRAFT: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
                            PENDING: { label: '待执行', color: 'bg-yellow-100 text-yellow-700' },
                            RUNNING: { label: '执行中', color: 'bg-blue-100 text-blue-700' },
                            COMPLETED: { label: '已完成', color: 'bg-green-100 text-green-700' },
                            FAILED: { label: '失败', color: 'bg-red-100 text-red-700' },
                          }
                          const statusCfg = taskStatusConfig[task.status] || taskStatusConfig.DRAFT
                          const dueDate = task.dueDate ? new Date(task.dueDate) : null
                          const isOverdue = dueDate && dueDate < new Date() && task.status === 'PENDING'

                          return (
                            <li key={task.id} className={`rounded-lg border p-3 space-y-1.5 ${isOverdue ? 'border-amber-300 bg-amber-50/30' : 'border-gray-100'}`}>
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">{task.name}</p>
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                                  {statusCfg.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-600">
                                  {taskTypeLabels[task.type] || task.type}
                                </span>
                                {dueDate && (
                                  <span className={`flex items-center gap-1 ${isOverdue ? 'text-amber-600 font-medium' : ''}`}>
                                    <Clock className="h-3 w-3" />
                                    {dueDate.toLocaleDateString('zh-CN')}
                                    {isOverdue && ' (已逾期)'}
                                  </span>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {/* Customs Tab */}
                {drawerTab === 'customs' && customsProfile && (
                  <div className="space-y-3 rounded-lg border border-cyan-100 bg-cyan-50/40 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">{customsProfile.companyName}</p>
                      {customsProfile.purchaseIntentScore != null && (
                        <span className="text-sm font-semibold text-cyan-700">
                          意向 {customsProfile.purchaseIntentScore}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <p>装运次数：{customsProfile.totalShipments ?? '—'}</p>
                      <p>总金额：${(customsProfile.totalAmountUsd ?? 0).toLocaleString()}</p>
                    </div>
                    {customsProfile.aiSummary && (
                      <p className="text-xs text-gray-700 leading-relaxed">{customsProfile.aiSummary}</p>
                    )}
                    <Link href="/customs" className="text-xs text-primary hover:underline">
                      在海关数据中查看 →
                    </Link>
                  </div>
                )}
              </div>

              {/* Timestamps */}
              <div className="text-xs text-gray-400 space-y-1">
                <p>{t('common.createdAt')}：{new Date(currentContact.createdAt).toLocaleString('zh-CN')}</p>
                <p>{t('common.updatedAt')}：{new Date(currentContact.updatedAt).toLocaleString('zh-CN')}</p>
              </div>

              {/* Actions */}
<<<<<<< HEAD
              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1" onClick={() => { setShowDetailDrawer(false); openEditDialog(currentContact) }}>
                  <Edit className="h-4 w-4 mr-2" /> {t('common.edit')}
                </Button>
                <Button variant="outline" className="flex-1">
                  <Send className="h-4 w-4 mr-2" /> {t('contacts.sendEmail')}
=======
              <div className="flex flex-col gap-2 pt-4 border-t">
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => { setShowDetailDrawer(false); openEditDialog(currentContact) }}>
                    <Edit className="h-4 w-4 mr-2" /> 编辑
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Send className="h-4 w-4 mr-2" /> 发送邮件
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleExportContactGdpr(currentContact.id, currentContact.fullName)}
                >
                  <Download className="h-4 w-4 mr-2" /> 导出个人数据 (GDPR)
>>>>>>> feat/landing-page
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{t('contacts.importContacts')}</h2>
              <button onClick={() => setShowImportDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <CSVImport
                onImportComplete={(result) => {
                  addToast({
                    type: 'success',
                    title: t('contacts.importContacts'),
                    description: t('contacts.createSuccess'),
                  })
                  fetchContacts()
                  setShowImportDialog(false)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n()
  const map: Record<string, { label: string; color: string }> = {
    NEW: { label: t('contacts.status.new'), color: 'bg-blue-100 text-blue-700' },
    CONTACTED: { label: t('contacts.status.contacted'), color: 'bg-yellow-100 text-yellow-700' },
    INTERESTED: { label: t('contacts.status.interested'), color: 'bg-green-100 text-green-700' },
    QUALIFIED: { label: t('contacts.status.qualified'), color: 'bg-purple-100 text-purple-700' },
    CONVERTED: { label: t('contacts.status.converted'), color: 'bg-emerald-100 text-emerald-700' },
    NOT_INTERESTED: { label: t('contacts.status.notInterested'), color: 'bg-gray-100 text-gray-600' },
    UNREACHABLE: { label: t('contacts.status.unreachable'), color: 'bg-red-100 text-red-600' },
  }
  const s = map[status] || { label: status, color: 'bg-gray-100 text-gray-600' }
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
}

function DealStageBadge({ stage }: { stage: string }) {
  const map: Record<string, { label: string; color: string }> = {
    PROSPECTING: { label: '探索', color: 'bg-gray-100 text-gray-700' },
    QUALIFICATION: { label: '确认', color: 'bg-blue-100 text-blue-700' },
    PROPOSAL: { label: '方案', color: 'bg-amber-100 text-amber-700' },
    NEGOTIATION: { label: '谈判', color: 'bg-orange-100 text-orange-700' },
    CLOSED_WON: { label: '成交', color: 'bg-emerald-100 text-emerald-700' },
    CLOSED_LOST: { label: '失败', color: 'bg-red-100 text-red-700' },
  }
  const s = map[stage] || { label: stage, color: 'bg-gray-100 text-gray-600' }
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
}
