'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, Loader2, Mail, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorMessage, fetchJson } from './api'
import { EmailAccountOption } from './types'

type Props = {
  accounts: EmailAccountOption[]
  emailAccountId: string
  onSelectAccount: (id: string) => void
  onAccountsChange: (accounts: EmailAccountOption[]) => void
  onContinue: () => void
}

export function StepPrereq({
  accounts,
  emailAccountId,
  onSelectAccount,
  onAccountsChange,
  onContinue,
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '',
    displayName: '',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
  })

  const hasAccount = accounts.length > 0
  const selectedOk = !!emailAccountId && accounts.some((a) => a.id === emailAccountId)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { ok, data } = await fetchJson<{ success: boolean; data?: EmailAccountOption }>(
        '/api/email-accounts',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      )
      if (!ok || !data.success || !data.data) {
        setError(apiErrorMessage(data, '创建邮箱账户失败'))
        return
      }
      const next = [data.data, ...accounts]
      onAccountsChange(next)
      onSelectAccount(data.data.id)
      setShowForm(false)
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        发信必须使用您自己的 SMTP 邮箱账户。请先选择或添加一个发件账户，再继续后续步骤。
      </p>

      {hasAccount ? (
        <div className="space-y-3">
          <Label>选择发件账户</Label>
          <div className="space-y-2">
            {accounts.map((a) => (
              <label
                key={a.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                  emailAccountId === a.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="emailAccount"
                  checked={emailAccountId === a.id}
                  onChange={() => onSelectAccount(a.id)}
                  className="h-4 w-4 text-primary"
                />
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-900">
                  {a.displayName || a.email}
                </span>
                <span className="text-gray-500">{a.email}</span>
              </label>
            ))}
          </div>
          {selectedOk && (
            <p className="flex items-center gap-1.5 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" /> 已选择发件账户
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
          尚未配置邮箱账户。请在下方快速添加，或前往完整设置页。
        </div>
      )}

      {!showForm ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setShowForm(true)}>
            添加邮箱账户
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/dashboard/settings" className="gap-1.5">
              <Settings className="h-4 w-4" /> 打开完整设置
            </Link>
          </Button>
          {selectedOk && (
            <Button type="button" className="ml-auto" onClick={onContinue}>
              继续
            </Button>
          )}
        </div>
      ) : (
        <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-gray-200 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>邮箱 *</Label>
              <Input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value, smtpUser: form.smtpUser || e.target.value })}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>显示名称</Label>
              <Input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="Sales Team"
              />
            </div>
            <div className="space-y-1.5">
              <Label>SMTP Host *</Label>
              <Input
                required
                value={form.smtpHost}
                onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>SMTP Port</Label>
              <Input
                value={form.smtpPort}
                onChange={(e) => setForm({ ...form, smtpPort: e.target.value })}
                placeholder="587"
              />
            </div>
            <div className="space-y-1.5">
              <Label>SMTP 用户名 *</Label>
              <Input
                required
                value={form.smtpUser}
                onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>SMTP 密码 *</Label>
              <Input
                required
                type="password"
                value={form.smtpPassword}
                onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })}
              />
            </div>
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              保存账户
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              取消
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
