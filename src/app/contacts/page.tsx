'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/hooks/use-i18n'
import { CSVImport } from '@/components/CSVImport'
import {
  Users, Plus, Download, Upload, Search, Mail, Building, Tag,
  ChevronRight, Edit, Trash2, X, Loader2, UserPlus, Send, Check
} from 'lucide-react'

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
  const { t } = useI18n()
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
      addToast({ type: 'error', title: t('common.loadFailed'), description: t('contacts.loadFailedDesc') })
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

  const openDetailDrawer = (contact: Contact) => {
    setCurrentContact(contact)
    setShowDetailDrawer(true)
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
                <Label>{t('contacts.form.company')}</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder={t('contacts.form.companyPlaceholder')}
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

      {/* Detail Drawer */}
      {showDetailDrawer && currentContact && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowDetailDrawer(false)} />
          <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('contacts.detail')}</h2>
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

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{t('common.statusLabel')}</span>
                <StatusBadge status={currentContact.status} />
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

              {/* Timestamps */}
              <div className="text-xs text-gray-400 space-y-1">
                <p>{t('common.createdAt')}：{new Date(currentContact.createdAt).toLocaleString('zh-CN')}</p>
                <p>{t('common.updatedAt')}：{new Date(currentContact.updatedAt).toLocaleString('zh-CN')}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1" onClick={() => { setShowDetailDrawer(false); openEditDialog(currentContact) }}>
                  <Edit className="h-4 w-4 mr-2" /> {t('common.edit')}
                </Button>
                <Button variant="outline" className="flex-1">
                  <Send className="h-4 w-4 mr-2" /> {t('contacts.sendEmail')}
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
