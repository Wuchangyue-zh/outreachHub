'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelect, type SearchableOption } from '@/components/ui/searchable-select'
import { toast } from 'sonner'
import {
  Plus,
  RefreshCw,
  GripVertical,
  DollarSign,
  Calendar,
  User,
  Building2,
  TrendingUp,
  Target,
  ChevronRight,
} from 'lucide-react'

// ─── Stage Configuration ───────────────────────────────────────────────────

type StageKey = 'LEAD' | 'OPPORTUNITY' | 'QUOTE' | 'WON' | 'LOST'

interface StageConfig {
  key: StageKey
  label: string
  color: string
  bgColor: string
  borderColor: string
  headerBg: string
}

const STAGES: StageConfig[] = [
  {
    key: 'LEAD',
    label: '线索',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    headerBg: 'bg-blue-100',
  },
  {
    key: 'OPPORTUNITY',
    label: '商机',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    headerBg: 'bg-yellow-100',
  },
  {
    key: 'QUOTE',
    label: '报价',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    headerBg: 'bg-purple-100',
  },
  {
    key: 'WON',
    label: '成交',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    headerBg: 'bg-green-100',
  },
  {
    key: 'LOST',
    label: '流失',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    headerBg: 'bg-red-100',
  },
]

const STAGE_MAP: Record<StageKey, StageConfig> = Object.fromEntries(
  STAGES.map((s) => [s.key, s])
) as Record<StageKey, StageConfig>

// ─── Types ─────────────────────────────────────────────────────────────────

interface Deal {
  id: string
  title: string
  stage: StageKey
  amount: number | null
  currency: string
  expectedClose: string | null
  probability: number
  contactId: string | null
  contactName?: string | null
  companyId: string | null
  companyName?: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  contact?: { id: string; fullName: string } | null
  company?: { id: string; name: string } | null
}

interface StageStats {
  count: number
  totalAmount: number
}

interface PipelineStats {
  byStage: Record<StageKey, StageStats>
  conversionRate: Record<string, number>
  totalDeals: number
  wonDeals: number
  wonAmount: number
  avgDealCycle: number | null
}

interface DealFormData {
  title: string
  stage: StageKey
  amount: string
  currency: string
  expectedClose: string
  probability: string
  contactId: string
  companyId: string
  notes: string
}

const EMPTY_FORM: DealFormData = {
  title: '',
  stage: 'LEAD',
  amount: '',
  currency: 'USD',
  expectedClose: '',
  probability: '10',
  contactId: '',
  companyId: '',
  notes: '',
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatCurrency(amount: number | null, currency: string = 'USD'): string {
  if (amount === null || amount === undefined) return '-'
  const formatter = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return formatter.format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function getProbabilityColor(prob: number): string {
  if (prob >= 80) return 'bg-green-100 text-green-700 border-green-200'
  if (prob >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  if (prob >= 20) return 'bg-blue-100 text-blue-700 border-blue-200'
  return 'bg-gray-100 text-gray-600 border-gray-200'
}

// ─── Deal Card Component ───────────────────────────────────────────────────

interface DealCardProps {
  deal: Deal
  onEdit: (deal: Deal) => void
  onDragStart: (e: React.DragEvent<HTMLDivElement>, dealId: string) => void
}

function DealCard({ deal, onEdit, onDragStart }: DealCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      onClick={() => onEdit(deal)}
      className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm
        transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit(deal)
        }
      }}
      aria-label={`商机: ${deal.title}`}
    >
      {/* Title row with drag handle */}
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {deal.title}
          </p>
        </div>
      </div>

      {/* Amount */}
      {deal.amount !== null && deal.amount > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-gray-200">
          <DollarSign className="h-3.5 w-3.5 text-gray-400" />
          {formatCurrency(deal.amount, deal.currency)}
        </div>
      )}

      {/* Meta info */}
      <div className="mt-2 space-y-1">
        {(deal.contactName || deal.contact?.fullName) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{deal.contactName || deal.contact?.fullName}</span>
          </div>
        )}
        {(deal.companyName || deal.company?.name) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{deal.companyName || deal.company?.name}</span>
          </div>
        )}
      </div>

      {/* Footer: expected close + probability */}
      <div className="mt-2.5 flex items-center justify-between">
        {deal.expectedClose && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="h-3 w-3" />
            {formatDate(deal.expectedClose)}
          </span>
        )}
        <Badge
          className={`text-[10px] px-1.5 py-0 ${getProbabilityColor(deal.probability)}`}
        >
          {deal.probability}%
        </Badge>
      </div>
    </div>
  )
}

// ─── Kanban Column Component ──────────────────────────────────────────────

interface KanbanColumnProps {
  stage: StageConfig
  deals: Deal[]
  stats: StageStats | undefined
  isDragOver: boolean
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>, stage: StageKey) => void
  onEdit: (deal: Deal) => void
  onDragStart: (e: React.DragEvent<HTMLDivElement>, dealId: string) => void
}

function KanbanColumn({
  stage,
  deals,
  stats,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onEdit,
  onDragStart,
}: KanbanColumnProps) {
  return (
    <div
      className={`flex min-w-[280px] flex-shrink-0 flex-col rounded-lg border-2 transition-colors ${
        isDragOver
          ? 'border-primary bg-primary/5'
          : `${stage.borderColor} ${stage.bgColor}`
      } dark:border-gray-700 dark:bg-gray-800/50`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, stage.key)}
      role="region"
      aria-label={`${stage.label}阶段`}
    >
      {/* Column header */}
      <div className={`rounded-t-md px-4 py-3 ${stage.headerBg} dark:bg-gray-700`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${stage.color} dark:text-gray-100`}>
              {stage.label}
            </span>
            <Badge className="bg-white/80 text-gray-700 text-xs px-1.5 py-0 dark:bg-gray-600 dark:text-gray-200">
              {deals.length}
            </Badge>
          </div>
          {stats && stats.totalAmount > 0 && (
            <span className={`text-xs font-medium ${stage.color} dark:text-gray-300`}>
              {formatCurrency(stats.totalAmount)}
            </span>
          )}
        </div>
      </div>

      {/* Deal cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 380px)', minHeight: '200px' }}>
        {deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-xs text-gray-400">暂无商机</p>
            <p className="mt-1 text-[10px] text-gray-300">拖拽商机到此处</p>
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onEdit={onEdit}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Conversion Rate Display ──────────────────────────────────────────────

interface ConversionRateProps {
  stats: PipelineStats
}

function ConversionRateDisplay({ stats }: ConversionRateProps) {
  const stages: StageKey[] = ['LEAD', 'OPPORTUNITY', 'QUOTE', 'WON']
  const pairs: Array<{ from: StageKey; to: StageKey; label: string }> = []

  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i]
    const to = stages[i + 1]
    const fromCount = stats.byStage[from]?.count ?? 0
    const toCount = stats.byStage[to]?.count ?? 0
    const rate = fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0
    pairs.push({
      from,
      to,
      label: `${STAGE_MAP[from].label} -> ${STAGE_MAP[to].label}: ${rate}%`,
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pairs.map((pair, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            <ChevronRight className="mr-0.5 h-3 w-3 text-gray-400" />
            {pair.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page Component ──────────────────────────────────────────────────

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [stats, setStats] = useState<PipelineStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<DealFormData>(EMPTY_FORM)
  const [dragOverStage, setDragOverStage] = useState<StageKey | null>(null)

  // Quick-create dialog state
  const [quickCreateType, setQuickCreateType] = useState<'contact' | 'company' | null>(null)
  const [quickCreateSaving, setQuickCreateSaving] = useState(false)
  const [contactForm, setContactForm] = useState({ firstName: '', lastName: '', email: '', companyId: '' })
  const [companyForm, setCompanyForm] = useState({ name: '', domain: '' })
  const [editContactLabel, setEditContactLabel] = useState('')
  const [editCompanyLabel, setEditCompanyLabel] = useState('')

  // ── Data Fetching ──────────────────────────────────────────────────────

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch('/api/deals?limit=100')
      const data = await res.json()
      if (data.success) {
        setDeals(data.data)
      } else {
        toast.error(data.error?.message || '加载商机失败')
      }
    } catch {
      toast.error('加载商机失败')
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/deals/stats')
      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch {
      // stats failure is non-critical
    }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchDeals(), fetchStats()])
    setLoading(false)
  }, [fetchDeals, fetchStats])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ── Searchable Select fetchers ─────────────────────────────────────────

  const fetchContactOptions = useCallback(async (query: string): Promise<SearchableOption[]> => {
    const params = new URLSearchParams({ limit: '20' })
    if (query) params.set('search', query)
    const res = await fetch(`/api/contacts?${params}`)
    const data = await res.json()
    if (!data.success) return []
    return (data.data || []).map((c: { id: string; fullName: string; company?: { name?: string } | null }) => ({
      id: c.id,
      label: c.fullName,
      sublabel: c.company?.name || undefined,
    }))
  }, [])

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

  // ── Quick-create handlers ──────────────────────────────────────────────

  const handleQuickCreateContact = async () => {
    if (!contactForm.firstName.trim()) {
      toast.error('请输入姓')
      return
    }
    setQuickCreateSaving(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: contactForm.firstName.trim(),
          lastName: contactForm.lastName.trim(),
          companyId: contactForm.companyId || undefined,
          emails: contactForm.email.trim() ? [contactForm.email.trim()] : [],
        }),
      })
      const data = await res.json()
      if (data.success) {
        const newContact = data.data
        setFormData((prev) => ({ ...prev, contactId: newContact.id }))
        toast.success('联系人已创建')
        setQuickCreateType(null)
        setContactForm({ firstName: '', lastName: '', email: '', companyId: '' })
      } else {
        toast.error(data.error?.message || '创建失败')
      }
    } catch {
      toast.error('创建联系人失败')
    } finally {
      setQuickCreateSaving(false)
    }
  }

  const handleQuickCreateCompany = async () => {
    if (!companyForm.name.trim()) {
      toast.error('请输入公司名称')
      return
    }
    setQuickCreateSaving(true)
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyForm.name.trim(),
          domain: companyForm.domain.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const newCompany = data.data
        setFormData((prev) => ({ ...prev, companyId: newCompany.id }))
        toast.success('公司已创建')
        setQuickCreateType(null)
        setCompanyForm({ name: '', domain: '' })
      } else {
        toast.error(data.error?.message || '创建失败')
      }
    } catch {
      toast.error('创建公司失败')
    } finally {
      setQuickCreateSaving(false)
    }
  }

  // ── Group deals by stage ───────────────────────────────────────────────

  const dealsByStage: Record<StageKey, Deal[]> = {
    LEAD: [],
    OPPORTUNITY: [],
    QUOTE: [],
    WON: [],
    LOST: [],
  }

  for (const deal of deals) {
    if (dealsByStage[deal.stage]) {
      dealsByStage[deal.stage].push(deal)
    }
  }

  // ── Drag and Drop ─────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnterColumn = (stage: StageKey) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOverStage(stage)
  }

  const handleDragLeaveColumn = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear if leaving the column entirely (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) return
    setDragOverStage(null)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStage: StageKey) => {
    e.preventDefault()
    setDragOverStage(null)

    const dealId = e.dataTransfer.getData('text/plain')
    if (!dealId) return

    const deal = deals.find((d) => d.id === dealId)
    if (!deal || deal.stage === targetStage) return

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d))
    )

    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: targetStage }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`商机已移至「${STAGE_MAP[targetStage].label}」`)
        // Refresh to get accurate data
        await Promise.all([fetchDeals(), fetchStats()])
      } else {
        toast.error(data.error?.message || '更新失败')
        // Revert optimistic update
        await fetchDeals()
      }
    } catch {
      toast.error('更新商机阶段失败')
      await fetchDeals()
    }
  }

  // ── Dialog / Form ─────────────────────────────────────────────────────

  const resetForm = () => {
    setDialogOpen(false)
    setEditingDeal(null)
    setFormData(EMPTY_FORM)
    setEditContactLabel('')
    setEditCompanyLabel('')
  }

  const openCreateDialog = () => {
    setEditingDeal(null)
    setFormData(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEditDialog = (deal: Deal) => {
    setEditingDeal(deal)
    setFormData({
      title: deal.title,
      stage: deal.stage,
      amount: deal.amount !== null ? String(deal.amount) : '',
      currency: deal.currency || 'USD',
      expectedClose: deal.expectedClose ? deal.expectedClose.slice(0, 10) : '',
      probability: String(deal.probability),
      contactId: deal.contactId || '',
      companyId: deal.companyId || '',
      notes: deal.notes || '',
    })
    setEditContactLabel(deal.contactName || deal.contact?.fullName || '')
    setEditCompanyLabel(deal.companyName || deal.company?.name || '')
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('请输入商机名称')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title: formData.title.trim(),
        stage: formData.stage,
        currency: formData.currency,
        probability: Number(formData.probability) || 0,
        notes: formData.notes.trim() || null,
      }
      if (formData.amount) payload.amount = Number(formData.amount)
      if (formData.expectedClose) payload.expectedClose = formData.expectedClose
      if (formData.contactId.trim()) payload.contactId = formData.contactId.trim()
      if (formData.companyId.trim()) payload.companyId = formData.companyId.trim()

      const isEdit = editingDeal !== null
      const url = isEdit ? `/api/deals/${editingDeal.id}` : '/api/deals'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(isEdit ? '商机已更新' : '商机已创建')
        resetForm()
        await Promise.all([fetchDeals(), fetchStats()])
      } else {
        toast.error(data.error?.message || '保存失败')
      }
    } catch {
      toast.error('保存商机失败')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              销售漏斗
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              管理您的商机和交易进展
              {stats && (
                <span className="ml-2 text-gray-400">
                  共 {stats.totalDeals} 个商机
                </span>
              )}
            </p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            新建商机
          </Button>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Funnel summary cards */}
            {stats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {STAGES.map((stage) => {
                    const stageStats = stats.byStage[stage.key]
                    return (
                      <Card key={stage.key} className={`${stage.borderColor} dark:border-gray-700`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-medium ${stage.color}`}>
                              {stage.label}
                            </span>
                            <Badge
                              className={`${stage.headerBg} ${stage.color} text-xs px-1.5 py-0 dark:bg-gray-700 dark:text-gray-300`}
                            >
                              {stageStats?.count ?? 0}
                            </Badge>
                          </div>
                          <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(stageStats?.totalAmount ?? 0)}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {/* Conversion rates and summary stats */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="mb-2 text-xs font-medium text-gray-500">
                          阶段转化率
                        </p>
                        <ConversionRateDisplay stats={stats} />
                      </div>
                      <div className="flex flex-wrap gap-6 border-t pt-4 lg:border-t-0 lg:pt-0">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">成交数</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {stats.wonDeals}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">成交金额</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(stats.wonAmount)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">平均周期</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {stats.avgDealCycle !== null
                                ? `${stats.avgDealCycle} 天`
                                : '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Kanban board */}
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                {STAGES.map((stage) => (
                  <KanbanColumn
                    key={stage.key}
                    stage={stage}
                    deals={dealsByStage[stage.key]}
                    stats={stats?.byStage[stage.key]}
                    isDragOver={dragOverStage === stage.key}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeaveColumn}
                    onDrop={handleDrop}
                    onEdit={openEditDialog}
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingDeal ? '编辑商机' : '新建商机'}
            </DialogTitle>
            <DialogDescription>
              {editingDeal
                ? '修改商机的详细信息'
                : '填写商机信息以创建新的销售机会'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="deal-title">商机名称 *</Label>
              <Input
                id="deal-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="例: ABC Corp 企业版采购"
                required
              />
            </div>

            {/* Stage + Probability row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deal-stage">阶段</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(val) =>
                    setFormData({ ...formData, stage: val as StageKey })
                  }
                >
                  <SelectTrigger id="deal-stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.key} value={s.key}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal-probability">
                  成交概率 ({formData.probability}%)
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    id="deal-probability"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={formData.probability}
                    onChange={(e) =>
                      setFormData({ ...formData, probability: e.target.value })
                    }
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-primary"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.probability}
                    onChange={(e) =>
                      setFormData({ ...formData, probability: e.target.value })
                    }
                    className="w-16 text-center"
                  />
                </div>
              </div>
            </div>

            {/* Amount + Currency row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="deal-amount">金额</Label>
                <Input
                  id="deal-amount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal-currency">币种</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(val) =>
                    setFormData({ ...formData, currency: val })
                  }
                >
                  <SelectTrigger id="deal-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Expected Close */}
            <div className="space-y-2">
              <Label htmlFor="deal-close-date">预计成交日期</Label>
              <Input
                id="deal-close-date"
                type="date"
                value={formData.expectedClose}
                onChange={(e) =>
                  setFormData({ ...formData, expectedClose: e.target.value })
                }
              />
            </div>

            {/* Contact + Company */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>联系人</Label>
                <SearchableSelect
                  value={formData.contactId}
                  onChange={(id) => setFormData({ ...formData, contactId: id })}
                  onClear={() => setFormData({ ...formData, contactId: '' })}
                  onQuickCreate={() => setQuickCreateType('contact')}
                  fetchOptions={fetchContactOptions}
                  placeholder="搜索联系人..."
                  quickCreateLabel="新建联系人"
                  initialLabel={editContactLabel}
                />
              </div>
              <div className="space-y-2">
                <Label>公司</Label>
                <SearchableSelect
                  value={formData.companyId}
                  onChange={(id) => setFormData({ ...formData, companyId: id })}
                  onClear={() => setFormData({ ...formData, companyId: '' })}
                  onQuickCreate={() => setQuickCreateType('company')}
                  fetchOptions={fetchCompanyOptions}
                  placeholder="搜索公司..."
                  quickCreateLabel="新建公司"
                  initialLabel={editCompanyLabel}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="deal-notes">备注</Label>
              <Textarea
                id="deal-notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="备注信息..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                取消
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? '保存中...'
                  : editingDeal
                    ? '保存修改'
                    : '创建商机'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick-create Contact Dialog */}
      <Dialog
        open={quickCreateType === 'contact'}
        onOpenChange={(open) => {
          if (!open) {
            setQuickCreateType(null)
            setContactForm({ firstName: '', lastName: '', email: '', companyId: '' })
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>快速新建联系人</DialogTitle>
            <DialogDescription>填写基本信息，创建后自动关联到当前商机</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="qc-lastName">姓 *</Label>
                <Input
                  id="qc-lastName"
                  value={contactForm.lastName}
                  onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                  placeholder="张"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="qc-firstName">名 *</Label>
                <Input
                  id="qc-firstName"
                  value={contactForm.firstName}
                  onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                  placeholder="三"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="qc-email">邮箱</Label>
              <Input
                id="qc-email"
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                placeholder="zhangsan@example.com"
              />
            </div>
            <div className="space-y-1">
              <Label>公司</Label>
              <SearchableSelect
                value={contactForm.companyId}
                onChange={(id) => setContactForm({ ...contactForm, companyId: id })}
                onClear={() => setContactForm({ ...contactForm, companyId: '' })}
                onQuickCreate={() => setQuickCreateType('company')}
                fetchOptions={fetchCompanyOptions}
                placeholder="搜索公司..."
                quickCreateLabel="新建公司"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuickCreateType(null)
                setContactForm({ firstName: '', lastName: '', email: '', companyId: '' })
              }}
            >
              取消
            </Button>
            <Button type="button" onClick={handleQuickCreateContact} disabled={quickCreateSaving}>
              {quickCreateSaving ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick-create Company Dialog */}
      <Dialog
        open={quickCreateType === 'company'}
        onOpenChange={(open) => {
          if (!open) {
            setQuickCreateType(null)
            setCompanyForm({ name: '', domain: '' })
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>快速新建公司</DialogTitle>
            <DialogDescription>填写基本信息，创建后自动关联到当前商机</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="qc-company-name">公司名称 *</Label>
              <Input
                id="qc-company-name"
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                placeholder="ABC 科技有限公司"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qc-company-domain">域名</Label>
              <Input
                id="qc-company-domain"
                value={companyForm.domain}
                onChange={(e) => setCompanyForm({ ...companyForm, domain: e.target.value })}
                placeholder="example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuickCreateType(null)
                setCompanyForm({ name: '', domain: '' })
              }}
            >
              取消
            </Button>
            <Button type="button" onClick={handleQuickCreateCompany} disabled={quickCreateSaving}>
              {quickCreateSaving ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
