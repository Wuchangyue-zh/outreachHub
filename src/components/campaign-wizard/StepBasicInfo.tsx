'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useCampaignWizardStore } from '@/store/campaign-wizard-store'
import { ArrowRight, Mail, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface EmailAccountOption {
  id: string
  email: string
  displayName: string | null
  isActive: boolean
  dailySent: number
  dailyLimit: number
}

export function StepBasicInfo() {
  const {
    campaignName, setCampaignName,
    targetTags, setTargetTags,
    senderAccountId, setSenderAccountId,
    nextStep,
  } = useCampaignWizardStore()

  const [accounts, setAccounts] = useState<EmailAccountOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/email-accounts')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const active = (json.data as EmailAccountOption[]).filter((a) => a.isActive)
          setAccounts(active)
          if (active.length === 1 && !senderAccountId) {
            setSenderAccountId(active[0].id)
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [senderAccountId, setSenderAccountId])

  const canProceed = campaignName.trim() && senderAccountId

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">基础信息</h2>
        <p className="mt-1 text-sm text-gray-500">设置发信任务的基本参数</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaignName">任务名称 *</Label>
        <Input
          id="campaignName"
          placeholder="例：2024 Q4 德国汽车零部件买家开发"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetTags">目标买家行业 / 标签</Label>
        <Input
          id="targetTags"
          placeholder="例：automotive, machinery, electronics（用逗号分隔）"
          value={targetTags}
          onChange={(e) => setTargetTags(e.target.value)}
        />
        <p className="text-xs text-gray-400">用于后续筛选和统计，可留空</p>
      </div>

      <div className="space-y-3">
        <Label>发信邮箱账户 *</Label>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载邮箱账户...
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">尚未配置发信邮箱</p>
              <p className="mt-1 text-amber-700">
                请先在{' '}
                <Link href="/dashboard/settings" className="underline font-medium">
                  邮箱设置
                </Link>{' '}
                中添加 SMTP 账户后再创建 Campaign。
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((sender) => (
              <button
                key={sender.id}
                type="button"
                onClick={() => setSenderAccountId(sender.id)}
                className={`group flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-300 ${
                  senderAccountId === sender.id
                    ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-100'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    senderAccountId === sender.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {sender.displayName || sender.email.split('@')[0]}
                  </p>
                  <p className="truncate text-xs text-gray-500">{sender.email}</p>
                  <p className="text-xs text-gray-400">
                    今日 {sender.dailySent}/{sender.dailyLimit}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={nextStep} disabled={!canProceed} className="gap-2">
          下一步：导入受众
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
