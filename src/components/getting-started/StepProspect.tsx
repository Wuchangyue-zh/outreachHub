'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, FileUp, Loader2, Search, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  apiErrorMessage,
  candidatesFromSearch,
  fetchJson,
  importedFromProspectResults,
} from './api'
import { IcpData, ImportedContact, ProspectCandidate } from './types'

type Props = {
  icp: IcpData
  candidates: ProspectCandidate[]
  onCandidatesChange: (c: ProspectCandidate[]) => void
  importedContacts: ImportedContact[]
  onImported: (items: ImportedContact[]) => void
}

export function StepProspect({
  icp,
  candidates,
  onCandidatesChange,
  importedContacts,
  onImported,
}: Props) {
  const [mode, setMode] = useState<'search' | 'csv'>('search')
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [csvContent, setCsvContent] = useState('')
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({})
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; totalRows: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const selected = candidates.filter((c) => c.selected)

  const handleSearch = async () => {
    setError('')
    setInfo('')
    setSearching(true)
    try {
      const keywords = icp.keywords
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (icp.industry.trim() && !keywords.includes(icp.industry.trim())) {
        keywords.unshift(icp.industry.trim())
      }
      const { ok, data } = await fetchJson<{
        success: boolean
        data?: any[]
        meta?: { sources?: string[] }
      }>('/api/prospecting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'search-people-multi',
          params: {
            keywords,
            name: keywords[0],
            location: icp.country || undefined,
            sources: ['rocketreach', 'apollo'],
            limit: 25,
          },
        }),
      })
      if (!ok || !data.success) {
        const msg = apiErrorMessage(data, '搜索失败')
        setError(msg)
        if (msg.includes('API Key') || msg.includes('未配置')) {
          setMode('csv')
          setInfo('未配置拓客数据源 Key，已切换到 CSV 导入保底路径。')
        }
        onCandidatesChange([])
        return
      }
      const list = candidatesFromSearch(data.data || [])
      onCandidatesChange(list)
      if (list.length === 0) {
        setInfo('搜索无带邮箱结果。可换关键词，或改用 CSV 导入。')
        setMode('csv')
      } else {
        setInfo(
          `找到 ${list.length} 位联系人` +
            (data.meta?.sources?.length ? `（来源：${data.meta.sources.join(', ')}）` : '')
        )
      }
    } catch {
      setError('网络错误')
    } finally {
      setSearching(false)
    }
  }

  const handleImportSelected = async () => {
    if (selected.length === 0) {
      setError('请至少勾选一位联系人')
      return
    }
    setError('')
    setImporting(true)
    try {
      const { ok, data } = await fetchJson<{
        success: boolean
        data?: {
          results?: Array<{
            success: boolean
            id?: string
            email?: string
            name?: string
            alreadyExists?: boolean
          }>
        }
      }>('/api/prospecting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'import-contacts',
          contacts: selected.map((c) => ({
            email: c.email,
            fullName: c.fullName,
            firstName: c.firstName,
            lastName: c.lastName,
            title: c.title,
            country: c.country,
            source: 'getting-started',
          })),
        }),
      })
      if (!ok || !data.success) {
        setError(apiErrorMessage(data, '入库失败'))
        return
      }
      const imported = importedFromProspectResults(data.data?.results || [])
      const alreadyExistsCount = (data.data?.results || []).filter((r) => r.success && r.alreadyExists).length
      if (imported.length === 0) {
        setError('没有联系人可加入向导（请检查是否勾选了带邮箱的结果）')
        return
      }
      onImported(imported)
      const created = imported.length - alreadyExistsCount
      setInfo(
        alreadyExistsCount > 0
          ? `已纳入 ${imported.length} 人（新建 ${Math.max(0, created)}，已存在 ${alreadyExistsCount}）`
          : `成功入库 ${imported.length} 人`
      )
    } catch {
      setError('网络错误')
    } finally {
      setImporting(false)
    }
  }

  const handleCsvFile = async (file: File) => {
    setError('')
    setInfo('')
    const text = await file.text()
    setCsvContent(text)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/contacts/import/parse', { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok || !data.success) {
      setError(apiErrorMessage(data, 'CSV 解析失败'))
      return
    }
    setCsvPreview({ headers: data.data.headers, totalRows: data.data.totalRows })
    setCsvMapping(data.data.suggestedMapping || {})
  }

  const handleCsvConfirm = async () => {
    if (!csvContent) {
      setError('请先选择 CSV 文件')
      return
    }
    if (!csvMapping.email) {
      setError('请映射 email 列')
      return
    }
    setImporting(true)
    setError('')
    try {
      const { ok, data } = await fetchJson<{
        success: boolean
        data?: {
          success?: number
          importedEmails?: Array<{ contactId: string; address: string }>
        }
      }>('/api/contacts/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent, mapping: csvMapping }),
      })
      if (!ok || !data.success) {
        setError(apiErrorMessage(data, 'CSV 导入失败'))
        return
      }
      const emails = data.data?.importedEmails || []
      const items: ImportedContact[] = emails.map((e) => ({
        id: e.contactId,
        email: e.address,
        name: e.address,
      }))
      if (items.length === 0) {
        setError('未导入任何带邮箱的联系人')
        return
      }
      onImported(items)
      setInfo(`CSV 成功导入 ${items.length} 人`)
    } catch {
      setError('网络错误')
    } finally {
      setImporting(false)
    }
  }

  const toggleAll = (selected: boolean) => {
    onCandidatesChange(candidates.map((c) => ({ ...c, selected })))
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        在本页搜索并入库联系人。无拓客 API Key 时请使用 CSV 导入。海关数据无邮箱，不作为本向导发信主路径。
      </p>

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === 'search' ? 'default' : 'outline'}
          onClick={() => setMode('search')}
        >
          多源搜索
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'csv' ? 'default' : 'outline'}
          onClick={() => setMode('csv')}
        >
          CSV 导入
        </Button>
        <Button type="button" size="sm" variant="ghost" asChild>
          <Link href="/prospecting">高级拓客页</Link>
        </Button>
      </div>

      {mode === 'search' && (
        <div className="space-y-3">
          <Button type="button" className="gap-2" disabled={searching} onClick={handleSearch}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            按 ICP 搜索联系人
          </Button>

          {candidates.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  已选 {selected.length} / {candidates.length}
                </span>
                <div className="flex gap-2">
                  <button type="button" className="text-primary hover:underline" onClick={() => toggleAll(true)}>
                    全选
                  </button>
                  <button type="button" className="text-gray-500 hover:underline" onClick={() => toggleAll(false)}>
                    清空
                  </button>
                </div>
              </div>
              <div className="max-h-64 overflow-auto rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="p-2 w-8" />
                      <th className="p-2">姓名</th>
                      <th className="p-2">职位</th>
                      <th className="p-2">邮箱</th>
                      <th className="p-2">公司</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c) => (
                      <tr key={c.key} className="border-t">
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={c.selected}
                            onChange={(e) =>
                              onCandidatesChange(
                                candidates.map((x) =>
                                  x.key === c.key ? { ...x, selected: e.target.checked } : x
                                )
                              )
                            }
                          />
                        </td>
                        <td className="p-2 font-medium">{c.fullName}</td>
                        <td className="p-2 text-gray-600">{c.title || '—'}</td>
                        <td className="p-2 text-gray-600">{c.email}</td>
                        <td className="p-2 text-gray-600">{c.company || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="button" disabled={importing || selected.length === 0} onClick={handleImportSelected} className="gap-2">
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                入库所选联系人
              </Button>
            </div>
          )}
        </div>
      )}

      {mode === 'csv' && (
        <div className="space-y-3 rounded-lg border border-dashed border-gray-300 p-4">
          <p className="text-sm text-gray-600">
            CSV 至少包含 email 列。示例表头：email,firstName,lastName,title,company
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleCsvFile(f)
            }}
          />
          <Button type="button" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
            <FileUp className="h-4 w-4" /> 选择 CSV
          </Button>
          {csvPreview && (
            <div className="space-y-2 text-sm">
              <p>
                共 {csvPreview.totalRows} 行 · 列：{csvPreview.headers.join(', ')}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {['email', 'firstName', 'lastName', 'fullName', 'title', 'company'].map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">{field}{field === 'email' ? ' *' : ''}</Label>
                    <select
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                      value={csvMapping[field] || ''}
                      onChange={(e) => setCsvMapping({ ...csvMapping, [field]: e.target.value })}
                    >
                      <option value="">—</option>
                      {csvPreview.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <Button type="button" className="gap-2" disabled={importing} onClick={handleCsvConfirm}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                确认导入
              </Button>
            </div>
          )}
        </div>
      )}

      {importedContacts.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 text-sm text-green-800">
          本向导已入库 <strong>{importedContacts.length}</strong> 位联系人，可进入下一步验证。
        </div>
      )}

      {info && <p className="text-sm text-blue-700">{info}</p>}
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}
    </div>
  )
}
