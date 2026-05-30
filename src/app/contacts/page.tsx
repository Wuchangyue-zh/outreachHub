'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { CSVImport } from '@/components/CSVImport'
import {
  Users, Plus, Download, Upload, Search, Mail, Building, Tag,
  ChevronRight, Edit, Trash2, X, Loader2, UserPlus, Send, Check,
  Eye, MousePointer, MessageSquare, AlertCircle,
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
  createdAt: string
  updatedAt: string
}

export default function ContactsPage() {
  const { addToast } = useToast()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDetailDrawer, setShowDetailDrawer] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [currentContact, setCurrentContact] = useState<Contact | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [timelineSummary, setTimelineSummary] = useState<TimelineSummary | null>(null)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const limit = 20

  // Form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    title: '',
    department: '',
    company: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    tags: '',
    notes: '',
  })

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
      addToast({ type: 'error', title: '加载失败', description: '无法获取客户列表' })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      firstName: '', lastName: '', title: '', department: '',
      company: '', email: '', phone: '', country: '', city: '', tags: '', notes: '',
    })
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
      company: contact.company?.name || '',
      email: contact.emails[0]?.address || '',
      phone: '',
      country: contact.country || '',
      city: contact.city || '',
      tags: contact.tags.join(', '),
      notes: contact.notes || '',
    })
    setShowEditDialog(true)
  }

  const openDetailDrawer = async (contact: Contact) => {
    setCurrentContact(contact)
    setShowDetailDrawer(true)
    setTimelineEvents([])
    setTimelineSummary(null)
    setTimelineLoading(true)
    try {
      const res = await fetch(`/api/contacts/${contact.id}/timeline`)
      const data = await res.json()
      if (data.success) {
        setTimelineEvents(data.data.timeline || [])
        setTimelineSummary(data.data.summary || null)
      }
    } catch (e) {
      console.error('Failed to load timeline:', e)
    } finally {
      setTimelineLoading(false)
    }
  }

  const confirmDelete = (contact: Contact) => {
    setCurrentContact(contact)
    setShowDeleteDialog(true)
  }

  const handleSave = async (isEdit: boolean) => {
    if (!form.firstName || !form.email) {
      addToast({ type: 'error', title: '请填写必填项', description: '姓名和邮箱为必填' })
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
          company: form.company,
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
          title: isEdit ? '更新成功' : '创建成功',
          description: `客户 ${form.firstName} ${form.lastName} 已${isEdit ? '更新' : '创建'}`
        })
        setShowAddDialog(false)
        setShowEditDialog(false)
        fetchContacts()
      } else {
        addToast({ type: 'error', title: '操作失败', description: data.error })
      }
    } catch (e) {
      addToast({ type: 'error', title: '操作失败', description: '网络错误，请稍后重试' })
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
        addToast({ type: 'success', title: '删除成功', description: `客户 ${currentContact.fullName} 已删除` })
        setShowDeleteDialog(false)
        setCurrentContact(null)
        fetchContacts()
      } else {
        addToast({ type: 'error', title: '删除失败', description: data.error })
      }
    } catch (e) {
      addToast({ type: 'error', title: '删除失败', description: '网络错误' })
    } finally {
      setSaving(false)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      addToast({ type: 'warning', title: '请选择客户', description: '请先选择要删除的客户' })
      return
    }

    setSaving(true)
    try {
      const promises = Array.from(selectedIds).map(id =>
        fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      )
      await Promise.all(promises)
      addToast({ type: 'success', title: '批量删除成功', description: `已删除 ${selectedIds.size} 个客户` })
      setSelectedIds(new Set())
      fetchContacts()
    } catch (e) {
      addToast({ type: 'error', title: '批量删除失败' })
    } finally {
      setSaving(false)
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
    addToast({ type: 'info', title: '导出中...', description: '正在准备导出文件' })
    // In a real app, this would call the export API
    const csv = [
      ['姓名', '职位', '公司', '邮箱', '国家', '城市', '标签', '状态'].join(','),
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

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `客户列表_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    addToast({ type: 'success', title: '导出成功' })
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
            <h1 className="text-2xl font-bold text-gray-900">客户管理</h1>
            <p className="text-sm text-gray-500">管理您的海外客户联系人信息</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4" /> 导入
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" /> 导出
            </Button>
            <Button className="gap-2" onClick={openAddDialog}>
              <UserPlus className="h-4 w-4" /> 添加客户
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
                  placeholder="搜索姓名、职位、邮箱..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">已选 {selectedIds.size} 项</span>
                  <Button variant="destructive" size="sm" onClick={handleBatchDelete} disabled={saving}>
                    <Trash2 className="h-4 w-4 mr-1" /> 批量删除
                  </Button>
                  <Button variant="outline" size="sm">
                    <Send className="h-4 w-4 mr-1" /> 批量发邮件
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
                    <th className="px-4 py-3 text-left font-medium text-gray-500">客户信息</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">公司</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">邮箱</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">国家/城市</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">标签</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">状态</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">操作</th>
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
                        <p className="text-gray-500 font-medium">暂无客户数据</p>
                        <p className="text-sm text-gray-400 mt-1">点击"添加客户"开始建立您的客户库</p>
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
                <p className="text-sm text-gray-500">共 {total} 条记录</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    上一页
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
                    下一页
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
              <h2 className="text-lg font-semibold">{showEditDialog ? '编辑客户' : '添加客户'}</h2>
              <button onClick={() => { setShowAddDialog(false); setShowEditDialog(false) }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>姓名 *</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="名"
                  />
                </div>
                <div>
                  <Label>姓氏</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="姓"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>职位</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="如：CTO, VP Sales"
                  />
                </div>
                <div>
                  <Label>部门</Label>
                  <Input
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder="如：Engineering, Sales"
                  />
                </div>
              </div>
              <div>
                <Label>邮箱 *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@company.com"
                />
              </div>
              <div>
                <Label>公司</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="公司名称"
                />
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
                <Label>标签（逗号分隔）</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="如：VIP, 科技行业, 北美"
                />
              </div>
              <div>
                <Label>备注</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="添加备注信息..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => { setShowAddDialog(false); setShowEditDialog(false) }}>
                取消
              </Button>
              <Button onClick={() => handleSave(showEditDialog)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {showEditDialog ? '保存修改' : '添加客户'}
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
                  <h3 className="font-semibold">确认删除</h3>
                  <p className="text-sm text-gray-500">此操作不可撤销</p>
                </div>
              </div>
              <p className="text-gray-600">
                确定要删除客户 <span className="font-medium">{currentContact.fullName}</span> 吗？
                所有关联数据将被永久删除。
              </p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>取消</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {showDetailDrawer && currentContact && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowDetailDrawer(false)} />
          <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">客户详情</h2>
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
                  <p className="text-gray-500">{currentContact.title || '未设置职位'}</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">状态：</span>
                <StatusBadge status={currentContact.status} />
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">联系方式</h4>
                {currentContact.emails.map((email, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{email.address}</span>
                    {email.isVerified && <Check className="h-3 w-3 text-green-500" />}
                    {email.isPrimary && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">主要</span>}
                  </div>
                ))}
              </div>

              {/* Company */}
              {currentContact.company && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">公司信息</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-gray-400" />
                    <span>{currentContact.company.name}</span>
                  </div>
                </div>
              )}

              {/* Location */}
              {(currentContact.country || currentContact.city) && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">所在地</h4>
                  <p className="text-sm text-gray-600">
                    {[currentContact.city, currentContact.country].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}

              {/* Tags */}
              {currentContact.tags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">标签</h4>
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
                  <h4 className="font-medium text-gray-900">备注</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{currentContact.notes}</p>
                </div>
              )}

              {/* Interaction Timeline */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">互动时间线</h4>
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
                ) : timelineEvents.length === 0 ? (
                  <p className="text-sm text-gray-400">暂无邮件互动记录</p>
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

              {/* Timestamps */}
              <div className="text-xs text-gray-400 space-y-1">
                <p>创建时间：{new Date(currentContact.createdAt).toLocaleString('zh-CN')}</p>
                <p>更新时间：{new Date(currentContact.updatedAt).toLocaleString('zh-CN')}</p>
              </div>

              {/* Actions */}
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
              <h2 className="text-lg font-semibold">Import Contacts from CSV</h2>
              <button onClick={() => setShowImportDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <CSVImport
                onImportComplete={(result) => {
                  addToast({
                    type: 'success',
                    title: 'Import Complete',
                    description: `Successfully imported ${result.success} contacts. ${result.failed} failed.`,
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
  const map: Record<string, { label: string; color: string }> = {
    NEW: { label: '新客户', color: 'bg-blue-100 text-blue-700' },
    CONTACTED: { label: '已联系', color: 'bg-yellow-100 text-yellow-700' },
    INTERESTED: { label: '有意向', color: 'bg-green-100 text-green-700' },
    QUALIFIED: { label: '已确认', color: 'bg-purple-100 text-purple-700' },
    CONVERTED: { label: '已转化', color: 'bg-emerald-100 text-emerald-700' },
    NOT_INTERESTED: { label: '无意向', color: 'bg-gray-100 text-gray-600' },
    UNREACHABLE: { label: '无法联系', color: 'bg-red-100 text-red-600' },
  }
  const s = map[status] || { label: status, color: 'bg-gray-100 text-gray-600' }
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
}
