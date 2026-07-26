'use client'

import { useState } from 'react'
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiErrorMessage, fetchJson } from './api'
import { ImportedContact, isSendableVerifyStatus } from './types'

type Props = {
  importedContacts: ImportedContact[]
  onUpdateContacts: (contacts: ImportedContact[]) => void
}

export function StepVerify({ importedContacts, onUpdateContacts }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<{
    total: number
    valid: number
    invalid: number
    catchAll: number
    unknown: number
  } | null>(null)

  const sendable = importedContacts.filter((c) => isSendableVerifyStatus(c.verifyStatus))
  const verifiedOnce = importedContacts.some((c) => c.verifyStatus)

  const handleVerify = async () => {
    if (importedContacts.length === 0) {
      setError('没有可验证的联系人，请先完成获客入库')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { ok, data } = await fetchJson<{
        success: boolean
        data?: {
          total: number
          valid: number
          invalid: number
          catchAll: number
          unknown: number
          results: Array<{ email: string; status: string }>
        }
      }>('/api/contacts/verify-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: importedContacts.map((c) => c.id) }),
      })
      if (!ok || !data.success || !data.data) {
        setError(apiErrorMessage(data, '验证失败'))
        return
      }
      const statusByEmail = new Map(
        (data.data.results || []).map((r) => [r.email.toLowerCase().trim(), r.status])
      )
      onUpdateContacts(
        importedContacts.map((c) => {
          const matched = statusByEmail.get(c.email.toLowerCase().trim())
          // Unmatched emails stay unverified (not defaulted to sendable "unknown")
          if (!matched) {
            return { ...c, verifyStatus: undefined }
          }
          return { ...c, verifyStatus: matched }
        })
      )
      setSummary({
        total: data.data.total,
        valid: data.data.valid,
        invalid: data.data.invalid,
        catchAll: data.data.catchAll,
        unknown: data.data.unknown,
      })
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        对本向导刚入库的联系人执行批量邮箱验证。有效 / 未知 / Catch-all 可作为发送受众；无效邮箱将排除。
      </p>

      <div className="rounded-lg border border-green-100 bg-green-50/40 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
          <div className="space-y-2 flex-1">
            <p className="text-sm text-gray-700">
              待验证联系人：<strong>{importedContacts.length}</strong>
            </p>
            <Button type="button" className="gap-2" disabled={loading || importedContacts.length === 0} onClick={handleVerify}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              开始批量验证
            </Button>
          </div>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 text-center text-sm">
          <Stat label="总计" value={summary.total} />
          <Stat label="有效" value={summary.valid} tone="green" />
          <Stat label="Catch-all" value={summary.catchAll} />
          <Stat label="未知" value={summary.unknown} />
          <Stat label="无效" value={summary.invalid} tone="red" />
        </div>
      )}

      {importedContacts.length > 0 && (
        <div className="max-h-56 overflow-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="p-2">姓名</th>
                <th className="p-2">邮箱</th>
                <th className="p-2">状态</th>
              </tr>
            </thead>
            <tbody>
              {importedContacts.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-2">{c.name || '—'}</td>
                  <td className="p-2 text-gray-600">{c.email}</td>
                  <td className="p-2">
                    <StatusBadge status={c.verifyStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {verifiedOnce && (
        <p className="text-sm text-green-700">
          可发送受众：<strong>{sendable.length}</strong> 人
          {sendable.length === 0 ? '（请重新导入有效邮箱）' : '，可进入创建活动'}
        </p>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'green' | 'red' }) {
  return (
    <div className="rounded-md border bg-white px-2 py-3">
      <div
        className={`text-lg font-semibold ${
          tone === 'green' ? 'text-green-600' : tone === 'red' ? 'text-red-600' : 'text-gray-900'
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-gray-400">未验证</span>
  const color =
    status === 'valid'
      ? 'text-green-700 bg-green-50'
      : status === 'invalid' || status === 'disposable'
        ? 'text-red-700 bg-red-50'
        : 'text-amber-700 bg-amber-50'
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${color}`}>{status}</span>
}
