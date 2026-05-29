'use client'

import DashboardLayout from '@/components/layout/dashboard-layout'
import { WizardShell } from '@/components/campaign-wizard/WizardShell'
import { StepBasicInfo } from '@/components/campaign-wizard/StepBasicInfo'
import { StepAudience } from '@/components/campaign-wizard/StepAudience'
import { StepAiWriter } from '@/components/campaign-wizard/StepAiWriter'
import { useCampaignWizardStore } from '@/store/campaign-wizard-store'

const stepComponents = {
  1: StepBasicInfo,
  2: StepAudience,
  3: StepAiWriter,
} as const

export default function NewCampaignPage() {
  const currentStep = useCampaignWizardStore((s) => s.currentStep)
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
