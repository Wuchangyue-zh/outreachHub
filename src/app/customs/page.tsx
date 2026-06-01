'use client'

import { useState, useCallback } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Search,
  Ship,
  Download,
  Loader2,
  Globe,
  Package,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SupplierSummary {
  name: string
  country?: string
  countryCode?: string
  shipmentCount: number
  totalAmountUsd: number
  lastShipmentDate?: string
}

interface HsCodeSummary {
  code: string
  description?: string
  count: number
  totalAmountUsd: number
}

interface CustomsBuyer {
  id: string
  companyName: string
  domain?: string
  country?: string
  countryCode?: string
  totalShipments: number
  totalAmountUsd: number
  lastShipmentDate?: string
  supplierCount: number
  topSuppliers: SupplierSummary[]
  topHsCodes: HsCodeSummary[]
  purchaseIntentScore?: number
  importedAsContact?: boolean
  profileId?: string
}

interface BuyerDetail extends CustomsBuyer {
  firstShipmentDate?: string
  avgShipmentAmount?: number
  shipments: Array<{
    importerName: string
    exporterName: string
    hsCode?: string
    shipmentDate?: string
    amountUsd?: number
  }>
  scoreBreakdown?: {
    frequency: number
    trend: number
    diversification: number
    recency: number
  }
  aiSummary?: string
}

function formatUsd(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

function formatDate(date?: string): string {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch {
    return date
  }
}

function ScoreBadge({ score }: { score?: number }) {
  if (score == null) return <span className="text-gray-400">—</span>
  const color =
    score >= 70 ? 'bg-green-100 text-green-700' :
    score >= 40 ? 'bg-yellow-100 text-yellow-700' :
    'bg-red-100 text-red-700'
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', color)}>
      {score}
    </span>
  )
}

function CountryFlag({ code }: { code?: string }) {
  if (!code || code.length !== 2) return <span>🌍</span>
  const flag = code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join('')
  return <span title={code}>{flag}</span>
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default function CustomsPage() {
  const [searchResults, setSearchResults] = useState<CustomsBuyer[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState('')
  const [formData, setFormData] = useState({
    hsCode: '',
    country: '',
    keyword: '',
    dateFrom: '',
    dateTo: '',
  })
  const [sortField, setSortField] = useState<'purchaseIntentScore' | 'totalShipments' | 'totalAmountUsd' | 'lastShipmentDate'>('purchaseIntentScore')
  const [sortAsc, setSortAsc] = useState(false)
  const [provider, setProvider] = useState('')

  const handleSearch = async () => {
    if (!formData.hsCode && !formData.country && !formData.keyword) {
      setMessage('请至少填写 HS 编码、国家或关键词之一')
      return
    }
    setSearching(true)
    setMessage('')
    setSelectedBuyer(null)
    setSelectedIds(new Set())
    try {
      const params = new URLSearchParams()
      if (formData.hsCode) params.set('hsCode', formData.hsCode)
      if (formData.country) params.set('country', formData.country)
      if (formData.keyword) params.set('keyword', formData.keyword)
      if (formData.dateFrom) params.set('dateFrom', formData.dateFrom)
      if (formData.dateTo) params.set('dateTo', formData.dateTo)
      params.set('limit', '50')

      const res = await fetch(`/api/customs/search?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setSearchResults(data.data || [])
        setProvider(data.provider || '')
        setMessage(
          data.data?.length
            ? `找到 ${data.data.length} 个买家（数据源：${data.provider || '未知'}）`
            : '未找到符合条件的买家，请调整搜索条件'
        )
      } else {
        setMessage(data.error?.message || data.message || '搜索失败')
      }
    } catch {
      setMessage('搜索请求失败')
    } finally {
      setSearching(false)
    }
  }

  const handleBuyerClick = async (buyer: CustomsBuyer) => {
    const buyerId = buyer.profileId || buyer.id
    setSelectedBuyer(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/customs/buyers/${encodeURIComponent(buyerId)}`)
      const data = await res.json()
      if (data.success) {
        setSelectedBuyer(data.data)
      } else {
        setMessage(data.error?.message || '获取买家详情失败')
      }
    } catch {
      setMessage('获取买家详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    const unimported = searchResults
      .filter((b) => !b.importedAsContact)
      .map((b) => b.profileId || b.id)
    if (unimported.every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(unimported))
    }
  }

  const handleImport = async () => {
    const ids = [...selectedIds]
    if (ids.length === 0) {
      setMessage('请先勾选要导入的买家')
      return
    }
    setImporting(true)
    setMessage('')
    try {
      const res = await fetch('/api/customs/import-to-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerIds: ids }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(`导入完成：成功 ${data.data.imported}，失败 ${data.data.failed}`)
        // 更新本地状态
        setSearchResults((prev) =>
          prev.map((b) => (selectedIds.has(b.profileId || b.id) ? { ...b, importedAsContact: true } : b))
        )
        setSelectedIds(new Set())
      } else {
        setMessage(data.error?.message || '导入失败')
      }
    } catch {
      setMessage('导入请求失败')
    } finally {
      setImporting(false)
    }
  }

  const sortedResults = [...searchResults].sort((a, b) => {
    let aVal: number | string = a[sortField] ?? 0
    let bVal: number | string = b[sortField] ?? 0
    if (sortField === 'lastShipmentDate') {
      aVal = aVal ? new Date(aVal as string).getTime() : 0
      bVal = bVal ? new Date(bVal as string).getTime() : 0
    }
    if (typeof aVal === 'string') return sortAsc ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null
    return sortAsc ? <ChevronUp className="inline h-3 w-3" /> : <ChevronDown className="inline h-3 w-3" />
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">海关数据获客</h1>
          <p className="text-sm text-gray-500">搜索全球贸易记录，发现高意向采购商，一键导入客户库</p>
        </div>

        {message && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* 左侧：搜索 + 结果 */}
          <Card className="lg:col-span-2 border-gray-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                海关数据搜索
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>HS 编码</Label>
                  <Input
                    placeholder="例如：8471.30 — 笔记本电脑"
                    value={formData.hsCode}
                    onChange={(e) => setFormData({ ...formData, hsCode: e.target.value })}
                  />
                </div>
                <div>
                  <Label>进口国</Label>
                  <Input
                    placeholder="例如：United States"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
                <div>
                  <Label>关键词（产品/公司名）</Label>
                  <Input
                    placeholder="例如：LED lighting"
                    value={formData.keyword}
                    onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                  />
                </div>
                <div>
                  <Label>日期范围（可选）</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={formData.dateFrom}
                      onChange={(e) => setFormData({ ...formData, dateFrom: e.target.value })}
                    />
                    <Input
                      type="date"
                      value={formData.dateTo}
                      onChange={(e) => setFormData({ ...formData, dateTo: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSearch} disabled={searching} className="w-full">
                {searching ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 搜索中...</>
                ) : (
                  <><Search className="mr-2 h-4 w-4" /> 搜索海关数据</>
                )}
              </Button>

              {searchResults.length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-gray-900">
                        搜索结果（{searchResults.length}）
                      </p>
                      {provider && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          {provider === 'mock' ? 'Demo 数据' : provider}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      disabled={importing || selectedIds.size === 0}
                      onClick={handleImport}
                    >
                      {importing ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-1 h-4 w-4" />
                      )}
                      导入选中（{selectedIds.size}）
                    </Button>
                  </div>

                  <div className="max-h-[500px] overflow-y-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50 text-left text-xs text-gray-500">
                        <tr>
                          <th className="p-2 w-8">
                            <input
                              type="checkbox"
                              checked={
                                searchResults.filter((b) => !b.importedAsContact).length > 0 &&
                                searchResults
                                  .filter((b) => !b.importedAsContact)
                                  .every((b) => selectedIds.has(b.profileId || b.id))
                              }
                              onChange={toggleSelectAll}
                            />
                          </th>
                          <th className="p-2">公司名称</th>
                          <th className="p-2">国家</th>
                          <th className="p-2 cursor-pointer hover:text-gray-700" onClick={() => handleSort('totalShipments')}>
                            装运次数 <SortIcon field="totalShipments" />
                          </th>
                          <th className="p-2 cursor-pointer hover:text-gray-700" onClick={() => handleSort('totalAmountUsd')}>
                            总金额 <SortIcon field="totalAmountUsd" />
                          </th>
                          <th className="p-2 cursor-pointer hover:text-gray-700" onClick={() => handleSort('purchaseIntentScore')}>
                            意向评分 <SortIcon field="purchaseIntentScore" />
                          </th>
                          <th className="p-2 cursor-pointer hover:text-gray-700" onClick={() => handleSort('lastShipmentDate')}>
                            最近装运 <SortIcon field="lastShipmentDate" />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedResults.map((buyer) => {
                          const rowId = buyer.profileId || buyer.id
                          return (
                            <tr
                              key={rowId}
                              className={cn(
                                'border-t hover:bg-gray-50 cursor-pointer',
                                selectedBuyer?.id === rowId && 'bg-blue-50',
                                buyer.importedAsContact && 'opacity-60'
                              )}
                              onClick={() => handleBuyerClick(buyer)}
                            >
                              <td className="p-2" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(rowId)}
                                  disabled={buyer.importedAsContact}
                                  onChange={() => toggleSelect(rowId)}
                                />
                              </td>
                              <td className="p-2">
                                <div className="font-medium text-gray-900">{buyer.companyName}</div>
                                {buyer.domain && (
                                  <div className="text-xs text-gray-400">{buyer.domain}</div>
                                )}
                                {buyer.importedAsContact && (
                                  <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-600 mt-0.5">
                                    已导入
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-gray-600">
                                <span className="flex items-center gap-1">
                                  <CountryFlag code={buyer.countryCode} />
                                  {buyer.country || '—'}
                                </span>
                              </td>
                              <td className="p-2 text-gray-700">{buyer.totalShipments}</td>
                              <td className="p-2 text-gray-700">{formatUsd(buyer.totalAmountUsd)}</td>
                              <td className="p-2"><ScoreBadge score={buyer.purchaseIntentScore} /></td>
                              <td className="p-2 text-gray-500 text-xs">{formatDate(buyer.lastShipmentDate)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 右侧：竞争情报 + 技巧 */}
          <div className="space-y-6">
            {/* 竞争情报侧栏 */}
            <Card className="border-gray-100">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  买家详情
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : selectedBuyer ? (
                  <div className="space-y-4">
                    {/* 基本信息 */}
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedBuyer.companyName}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <CountryFlag code={selectedBuyer.countryCode} />
                        {selectedBuyer.country || '未知国家'}
                        {selectedBuyer.domain && ` · ${selectedBuyer.domain}`}
                      </p>
                    </div>

                    {/* 评分 */}
                    {selectedBuyer.purchaseIntentScore != null && (
                      <div className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">采购意向评分</span>
                          <span className="text-2xl font-bold text-primary">{selectedBuyer.purchaseIntentScore}</span>
                        </div>
                        {selectedBuyer.scoreBreakdown && (
                          <div className="space-y-2">
                            <ScoreBar label="采购频次" value={selectedBuyer.scoreBreakdown.frequency} color="bg-blue-500" />
                            <ScoreBar label="金额趋势" value={selectedBuyer.scoreBreakdown.trend} color="bg-green-500" />
                            <ScoreBar label="供应商分散度" value={selectedBuyer.scoreBreakdown.diversification} color="bg-purple-500" />
                            <ScoreBar label="最近采购" value={selectedBuyer.scoreBreakdown.recency} color="bg-orange-500" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI 摘要 */}
                    {selectedBuyer.aiSummary && (
                      <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                        <p className="text-xs text-amber-800">
                          <Target className="inline h-3 w-3 mr-1" />
                          {selectedBuyer.aiSummary}
                        </p>
                      </div>
                    )}

                    {/* 关键指标 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <Package className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                        <p className="text-lg font-bold text-gray-900">{selectedBuyer.totalShipments}</p>
                        <p className="text-[10px] text-gray-500">装运次数</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <DollarSign className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                        <p className="text-lg font-bold text-gray-900">{formatUsd(selectedBuyer.totalAmountUsd)}</p>
                        <p className="text-[10px] text-gray-500">总金额</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <Users className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                        <p className="text-lg font-bold text-gray-900">{selectedBuyer.supplierCount}</p>
                        <p className="text-[10px] text-gray-500">供应商数</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <TrendingUp className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                        <p className="text-lg font-bold text-gray-900">
                          {selectedBuyer.avgShipmentAmount ? formatUsd(selectedBuyer.avgShipmentAmount) : '—'}
                        </p>
                        <p className="text-[10px] text-gray-500">平均单笔</p>
                      </div>
                    </div>

                    {/* Top 供应商 */}
                    {selectedBuyer.topSuppliers?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          主要供应商
                        </h4>
                        <div className="space-y-1.5">
                          {selectedBuyer.topSuppliers.slice(0, 5).map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-gray-700 truncate max-w-[140px]" title={s.name}>
                                <CountryFlag code={s.countryCode} /> {s.name}
                              </span>
                              <span className="text-gray-400 shrink-0">{s.shipmentCount} 次</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top HS 编码 */}
                    {selectedBuyer.topHsCodes?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 mb-2">主要 HS 编码</h4>
                        <div className="space-y-1.5">
                          {selectedBuyer.topHsCodes.slice(0, 5).map((h, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-gray-700">
                                {h.code} — {h.description || '未知'}
                              </span>
                              <span className="text-gray-400">{h.count} 次</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <BarChart3 className="h-8 w-8 mb-2" />
                    <p className="text-sm">点击搜索结果查看买家详情</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 搜索技巧 */}
            <Card className="border-gray-100">
              <CardHeader>
                <CardTitle className="text-base">搜索技巧</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <p>💡 <strong>HS 编码</strong>：使用 4-6 位前缀可匹配整个品类</p>
                <p>💡 <strong>国家</strong>：输入进口国（买家所在国），如 United States</p>
                <p>💡 <strong>关键词</strong>：产品英文名或公司名均可</p>
                <p>💡 <strong>评分越高</strong>，采购意向越强（≥70 为高意向）</p>
                <p>💡 点击表格列标题可排序</p>
              </CardContent>
            </Card>

            {/* Mock 提示 */}
            {provider === 'mock' && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <p className="text-xs text-amber-800">
                    ⚠️ 当前展示的是 <strong>Demo 数据</strong>。配置 <code>CUSTOMS_API_KEY</code> 环境变量后将使用真实海关数据。
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
