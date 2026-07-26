'use client'

import { useState } from 'react'
import { AlertCircle, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createDraftCampaignWithContacts } from './api'
import {
  CampaignDraftForm,
  EmailAccountOption,
  ImportedContact,
  isSendableVerifyStatus,
} from './types'

type Props = {
  form: CampaignDraftForm
  onChange: (form: CampaignDraftForm) => void
  accounts: EmailAccountOption[]
  emailAccountId: string
  onSelectAccount: (id: string) => void
  importedContacts: ImportedContact[]
  campaignId: string | null
  onCampaignCreated: (id: string) => void
}

export function StepCampaign({
  form,
  onChange,
  accounts,
  emailAccountId,
  onSelectAccount,
  importedContacts,
  campaignId,
  onCampaignCreated,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsSync, setNeedsSync] = useState(false)
  const [pendingCampaignId, setPendingCampaignId] = useState<string | null>(null)

  const audience = importedContacts.filter((c) => isSendableVerifyStatus(c.verifyStatus))
  const account = accounts.find((a) => a.id === emailAccountId)

  const handleCreate = async () => {
    setError('')
    if (!form.name.trim() || !form.subject.trim() || !form.content.trim()) {
      setError('请填写活动名称、主题与正文')
      return
    }
    if (!emailAccountId) {
      setError('请选择发件账户')
      return
    }
    if (audience.length === 0) {
      setError('没有可发送的已验证联系人')
      return
    }
    setLoading(true)
    try {
      const result = await createDraftCampaignWithContacts({
        name: form.name.trim(),
        subject: form.subject.trim(),
        content: form.content.trim(),
        emailAccountId,
        contactIds: audience.map((c) => c.id),
        fromEmail: account?.email,
        fromName: account?.displayName || undefined,
        existingCampaignId: pendingCampaignId || (needsSync ? campaignId : null),
      })
      if (!result.success) {
        if (result.campaignId) {
          setPendingCampaignId(result.campaignId)
          setNeedsSync(!!result.needsContactSync)
        }
        setError(result.error || '创建失败')
        return
      }
      setPendingCampaignId(null)
      setNeedsSync(false)
      if (result.campaignId) onCampaignCreated(result.campaignId)
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  const draftReady = !!campaignId && !needsSync
  const retryId = pendingCampaignId || campaignId

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        创建单次邮件活动草稿。受众自动使用本向导中验证通过的联系人（{audience.length} 人）。
      </p>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>活动名称 *</Label>
          <Input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="例：Q1 德国汽配开发"
            disabled={draftReady}
          />
        </div>
        <div className="space-y-1.5">
          <Label>邮件主题 *</Label>
          <Input
            value={form.subject}
            onChange={(e) => onChange({ ...form, subject: e.target.value })}
            placeholder="Subject line"
            disabled={draftReady}
          />
        </div>
        <div className="space-y-1.5">
          <Label>正文 *</Label>
          <textarea
            className="min-h-[140px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50"
            value={form.content}
            onChange={(e) => onChange({ ...form, content: e.target.value })}
            placeholder={'Hi {{firstName}},\n\n...'}
            disabled={draftReady}
          />
          <p className="text-xs text-gray-500">
            正文按纯文本安全转成 HTML；支持变量如 {'{{firstName}}'}、{'{{company}}'}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>发件账户 *</Label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
            value={emailAccountId}
            onChange={(e) => onSelectAccount(e.target.value)}
            disabled={draftReady}
          >
            <option value="">请选择</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName || a.email} ({a.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      {draftReady ? (
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 text-sm text-green-800">
          草稿已创建（ID: {campaignId!.slice(0, 8)}…），可进入下一步启动。
        </div>
      ) : (
        <Button type="button" className="gap-2" disabled={loading} onClick={handleCreate}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {needsSync && retryId ? '重试同步联系人' : '创建草稿活动'}
        </Button>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}
    </div>
  )
}
