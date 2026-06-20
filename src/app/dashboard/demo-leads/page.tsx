'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useI18n } from '@/hooks/use-i18n'
import {
  Loader2, Search, RefreshCw, ChevronDown, ChevronUp,
  Save, Clock, UserCircle, Mail, Building2, Phone, MessageSquare,
} from 'lucide-react'

interface DemoLead {
  id: string
  name: string
  email: string
  company: string | null
  phone: string | null
  message: string | null
  status: string
  internalNotes: string | null
  contactedAt: string | null
  createdAt: string
}

const STATUS_OPTIONS = ['pending', 'contacted', 'converted', 'rejected'] as const
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  contacted: 'bg-blue-100 text-blue-700',
  converted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function DemoLeadsPage() {
  const { t } = useI18n()
  const [leads, setLeads] = useState<DemoLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({})

  const fetchLeads = useCallback(async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch('/api/admin/demo-requests?' + params)
      const data = await res.json()
      if (data.success) {
        setLeads(data.data)
        setPagination(data.pagination)
        setPage(p)
      } else {
        setError(data.error?.message || t('dashboardSettings.demoLeads.loadFailed'))
      }
    } catch {
      setError(t('dashboardSettings.demoLeads.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, t])

  useEffect(() => { fetchLeads() }, []) // eslint-disable-line

  const handleSaveNotes = async (id: string) => {
    setSavingNotes(s => ({ ...s, [id]: true }))
    try {
      const res = await fetch('/api/admin/demo-requests/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internalNotes: editingNotes[id] ?? '' }),
      })
      const data = await res.json()
      if (data.success) {
        setLeads(ls => ls.map(l => l.id === id ? { ...l, internalNotes: editingNotes[id] } : l))
        toast.success(t('dashboardSettings.demoLeads.notesSaved'))
      } else {
        toast.error(data.error?.message || t('dashboardSettings.demoLeads.saveFailed'))
      }
    } catch {
      toast.error(t('dashboardSettings.demoLeads.saveFailed'))
    } finally {
      setSavingNotes(s => ({ ...s, [id]: false }))
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingStatus(s => ({ ...s, [id]: true }))
    try {
      const res = await fetch('/api/admin/demo-requests/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (data.success) {
        setLeads(ls => ls.map(l => l.id === id ? data.data : l))
        toast.success(t('dashboardSettings.demoLeads.statusUpdated'))
      } else {
        toast.error(data.error?.message || t('dashboardSettings.demoLeads.saveFailed'))
      }
    } catch {
      toast.error(t('dashboardSettings.demoLeads.saveFailed'))
    } finally {
      setUpdatingStatus(s => ({ ...s, [id]: false }))
    }
  }

  const statusLabel = (s: string) => t('dashboardSettings.demoLeads.status.' + s) || s

  return (
    <DashboardLayout>
      <div className="space-y-6 py-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboardSettings.demoLeads.title')}</h1>
          <p className="text-sm text-gray-500">{t('dashboardSettings.demoLeads.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder={t('dashboardSettings.demoLeads.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchLeads(1)} className="pl-9" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">{t('dashboardSettings.demoLeads.allStatuses')}</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={() => fetchLeads(1)}>
            <Search className="h-4 w-4 mr-1" />{t('dashboardSettings.demoLeads.search')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchLeads(page)} disabled={loading}>
            <RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> {t('dashboardSettings.demoLeads.loading')}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchLeads()}>{t('dashboardSettings.demoLeads.retry')}</Button>
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <UserCircle className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-3 text-sm text-gray-500">{t('dashboardSettings.demoLeads.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map(lead => (
              <Card key={lead.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{lead.name}</span>
                        <Badge className={STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-600'}>{statusLabel(lead.status)}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>
                        {lead.company && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{lead.company}</span>}
                        {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(lead.createdAt).toLocaleString('zh-CN')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <select value={lead.status} onChange={e => handleStatusChange(lead.id, e.target.value)} disabled={updatingStatus[lead.id]} className="text-xs rounded border px-2 py-1">
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                      </select>
                      <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}>
                        {expanded === lead.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {expanded === lead.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                      {lead.message && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" />{t('dashboardSettings.demoLeads.originalMessage')}</p>
                          <div className="rounded bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">{lead.message}</div>
                        </div>
                      )}
                      {lead.contactedAt && (
                        <p className="text-xs text-gray-400">{t('dashboardSettings.demoLeads.contactedAt')}: {new Date(lead.contactedAt).toLocaleString('zh-CN')}</p>
                      )}
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">{t('dashboardSettings.demoLeads.internalNotes')}</p>
                        <Textarea value={editingNotes[lead.id] ?? lead.internalNotes ?? ''} onChange={e => setEditingNotes(n => ({ ...n, [lead.id]: e.target.value }))} placeholder={t('dashboardSettings.demoLeads.notesPlaceholder')} rows={3} className="text-sm" />
                        <Button size="sm" className="mt-2" onClick={() => handleSaveNotes(lead.id)} disabled={savingNotes[lead.id]}>
                          {savingNotes[lead.id] ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                          {t('dashboardSettings.demoLeads.saveNotes')}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-400">{t('dashboardSettings.demoLeads.total')}: {pagination.total}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchLeads(page - 1)}>{t('dashboardSettings.demoLeads.prev')}</Button>
                  <span className="px-3 py-1 text-sm text-gray-500">{page}/{pagination.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => fetchLeads(page + 1)}>{t('dashboardSettings.demoLeads.next')}</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
