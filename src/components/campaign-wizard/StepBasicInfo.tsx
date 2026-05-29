'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useCampaignWizardStore } from '@/store/campaign-wizard-store'
import { ArrowRight, Mail } from 'lucide-react'

// Mock sender accounts — will be replaced by real API later
const MOCK_SENDERS = [
  { id: 's1', email: 'sales@outreach-hub.com', name: '销售团队' },
  { id: 's2', email: 'mike.chen@outreach-hub.com', name: 'Mike Chen' },
  { id: 's3', email: 'alice.wang@outreach-hub.com', name: 'Alice Wang' },
]

export function StepBasicInfo() {
  const {
    campaignName, setCampaignName,
    targetTags, setTargetTags,
    senderAccountId, setSenderAccountId,
    nextStep,
  } = useCampaignWizardStore()

  const canProceed = campaignName.trim() && senderAccountId

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">基础信息</h2>
        <p className="mt-1 text-sm text-gray-500">设置发信任务的基本参数</p>
      </div>

      {/* Campaign Name */}
      <div className="space-y-2">
        <Label htmlFor="campaignName">任务名称 *</Label>
        <Input
          id="campaignName"
          placeholder="例：2024 Q4 德国汽车零部件买家开发"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
        />
      </div>

      {/* Target Tags */}
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

      {/* Sender Account */}
      <div className="space-y-3">
        <Label>发信邮箱账户 *</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {MOCK_SENDERS.map((sender) => (
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
                <p className="truncate text-sm font-semibold text-gray-900">{sender.name}</p>
                <p className="truncate text-xs text-gray-500">{sender.email}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Next button */}
      <div className="flex justify-end pt-4">
        <Button onClick={nextStep} disabled={!canProceed} className="gap-2">
          下一步：导入受众
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
