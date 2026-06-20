'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { WizardShell } from '@/components/campaign-wizard/WizardShell'
import { StepBasicInfo } from '@/components/campaign-wizard/StepBasicInfo'
import { StepAudience } from '@/components/campaign-wizard/StepAudience'
import { StepAiWriter } from '@/components/campaign-wizard/StepAiWriter'
import { useCampaignWizardStore } from '@/store/campaign-wizard-store'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const stepComponents = {
  1: StepBasicInfo,
  2: StepAudience,
  3: StepAiWriter,
} as const

function CampaignWizardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const editId = searchParams.get('edit')
  const currentStep = useCampaignWizardStore((s) => s.currentStep)
  const editingCampaignId = useCampaignWizardStore((s) => s.editingCampaignId)
  const isHydrating = useCampaignWizardStore((s) => s.isHydrating)
  const hydrateError = useCampaignWizardStore((s) => s.hydrateError)
  const hydrateFromCampaign = useCampaignWizardStore((s) => s.hydrateFromCampaign)
  const resetWizard = useCampaignWizardStore((s) => s.resetWizard)
  const [fetching, setFetching] = useState(!!editId)
  const [fetchError, setFetchError] = useState('')

  const loadCampaign = useCallback(async (id: string) => {
    setFetching(true)
    setFetchError('')
    try {
      const res = await fetch(`/api/campaigns/${id}`)
      const json = await res.json()
      if (!res.ok || !json.success) {
        setFetchError(json.error?.message || json.message || '无法加载活动')
        return
      }
      const c = json.data
      if (c.status !== 'DRAFT' && c.status !== 'PAUSED') {
        setFetchError(`活动状态为「${c.status}」，仅支持编辑 DRAFT 和 PAUSED 状态的活动`)
        return
      }
      const contactIds = (c.campaignContacts || []).map((cc: any) => cc.contactId)
      hydrateFromCampaign({
        id: c.id,
        name: c.name,
        type: c.type,
        subject: c.subject,
        content: c.content,
        htmlContent: c.htmlContent,
        emailAccountId: c.emailAccountId,
        productId: c.productId,
        scheduleType: c.scheduleType,
        scheduledAt: c.scheduledAt,
        timezone: c.timezone,
        sendingWindows: c.sendingWindows,
        recurrenceRule: c.recurrenceRule,
        contactIds,
        sequence: c.sequence,
        abTestEnabled: c.abTestEnabled,
      })
    } catch {
      setFetchError('网络错误，请稍后重试')
    } finally {
      setFetching(false)
    }
  }, [hydrateFromCampaign])

  useEffect(() => {
    if (editId && !editingCampaignId) {
      loadCampaign(editId)
    }
    return () => {
      if (editId) resetWizard()
    }
  }, [editId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (fetching || (editId && isHydrating)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-500">正在加载活动数据...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (fetchError || hydrateError) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-red-600 font-medium">{fetchError || hydrateError}</p>
          <Button variant="outline" onClick={() => router.push('/campaigns')}>
            返回活动列表
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const StepComponent = stepComponents[currentStep]

  return (
    <DashboardLayout>
      <div className="py-8">
        <WizardShell>
          <StepComponent />
        </WizardShell>
      </div>
    </DashboardLayout>
  )
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    }>
      <CampaignWizardContent />
    </Suspense>
  )
}
