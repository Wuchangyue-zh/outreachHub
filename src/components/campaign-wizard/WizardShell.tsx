'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCampaignWizardStore, type WizardStep } from '@/store/campaign-wizard-store'

const steps: { id: WizardStep; label: string; description: string }[] = [
  { id: 1, label: '基础信息', description: '任务名称与发信账户' },
  { id: 2, label: '受众导入', description: '选择目标联系人' },
  { id: 3, label: 'AI 写信', description: '智能生成开发信' },
]

export function WizardShell({ children }: { children: React.ReactNode }) {
  const { currentStep, setStep } = useCampaignWizardStore()

  return (
    <div className="mx-auto max-w-4xl">
      {/* Step indicator */}
      <nav className="mb-10">
        <ol className="flex items-center">
          {steps.map((step, idx) => {
            const isCompleted = currentStep > step.id
            const isCurrent = currentStep === step.id
            const isClickable = step.id <= currentStep

            return (
              <li
                key={step.id}
                className={cn('flex items-center', idx < steps.length - 1 && 'flex-1')}
              >
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => setStep(step.id)}
                  className={cn(
                    'group flex items-center gap-3 text-left transition-all duration-300',
                    isClickable ? 'cursor-pointer' : 'cursor-default',
                  )}
                >
                  {/* Circle */}
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300',
                      isCompleted &&
                        'border-blue-600 bg-blue-600 text-white',
                      isCurrent &&
                        'border-blue-600 bg-white text-blue-600 shadow-lg shadow-blue-100',
                      !isCompleted &&
                        !isCurrent &&
                        'border-gray-200 bg-gray-50 text-gray-400',
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                  </span>

                  {/* Label */}
                  <div className="hidden sm:block">
                    <p
                      className={cn(
                        'text-sm font-semibold transition-colors',
                        isCurrent ? 'text-blue-700' : isCompleted ? 'text-gray-700' : 'text-gray-400',
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-400">{step.description}</p>
                  </div>
                </button>

                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div className="mx-4 h-px flex-1 bg-gray-200">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: currentStep > step.id ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Step content */}
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  )
}
