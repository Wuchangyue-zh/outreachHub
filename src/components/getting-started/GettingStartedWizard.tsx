'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Mail,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/use-i18n'
import { fetchJson } from './api'
import { useGettingStartedState } from './useGettingStartedState'
import { EmailAccountOption, WIZARD_STEPS, WizardStep, isSendableVerifyStatus } from './types'
import { StepPrereq } from './StepPrereq'
import { StepIcp } from './StepIcp'
import { StepProspect } from './StepProspect'
import { StepVerify } from './StepVerify'
import { StepCampaign } from './StepCampaign'
import { StepLaunch } from './StepLaunch'

const STEP_META: Record<
  WizardStep,
  { title: string; desc: string; icon: typeof Mail }
> = {
  prereq: {
    title: '配置发件邮箱',
    desc: '绑定 SMTP 账户，后续发信将使用该账户。',
    icon: Mail,
  },
  icp: {
    title: '定义目标客户 (ICP)',
    desc: '设置行业、国家与关键词，用于精准获客。',
    icon: Lightbulb,
  },
  prospect: {
    title: '搜索并入库联系人',
    desc: '多源搜索或 CSV 导入，在本页完成入库。',
    icon: Search,
  },
  verify: {
    title: '验证邮箱',
    desc: '批量验证本批联系人，筛选可发送受众。',
    icon: ShieldCheck,
  },
  campaign: {
    title: '创建营销活动',
    desc: '填写主题与正文，生成草稿活动。',
    icon: Send,
  },
  launch: {
    title: '启动发送',
    desc: '一键启动，邮件进入发送队列。',
    icon: BarChart3,
  },
}

export function GettingStartedWizard() {
  const { t } = useI18n()
  const router = useRouter()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<EmailAccountOption[]>([])
  const [bootLoading, setBootLoading] = useState(true)

  const state = useGettingStartedState(tenantId)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [usageRes, accountsRes] = await Promise.all([
          fetchJson<{ success: boolean; data?: { tenant?: { id: string } } }>('/api/tenant/usage'),
          fetchJson<{ success: boolean; data?: EmailAccountOption[] }>('/api/email-accounts'),
        ])
        if (cancelled) return
        if (usageRes.data.success && usageRes.data.data?.tenant?.id) {
          setTenantId(usageRes.data.data.tenant.id)
        } else {
          setTenantId('local')
        }
        if (accountsRes.data.success && Array.isArray(accountsRes.data.data)) {
          const list = accountsRes.data.data
          setAccounts(list)
        }
      } catch {
        if (!cancelled) setTenantId('local')
      } finally {
        if (!cancelled) setBootLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-select first account when available; clear stale stored IDs
  useEffect(() => {
    if (accounts.length === 0) return
    if (state.emailAccountId && accounts.some((a) => a.id === state.emailAccountId)) return
    state.setEmailAccountId(accounts[0].id)
  }, [accounts, state.emailAccountId, state.setEmailAccountId])

  const completion = useMemo(() => {
    const hasAccount =
      accounts.length > 0 && accounts.some((a) => a.id === state.emailAccountId)
    const hasIcp = !!(state.icp.industry.trim() || state.icp.keywords.trim())
    const hasContacts = state.importedContacts.length > 0
    const hasVerified = state.importedContacts.some((c) => isSendableVerifyStatus(c.verifyStatus))
    const hasCampaign = !!state.campaignId
    const hasLaunched = state.launched
    return { hasAccount, hasIcp, hasContacts, hasVerified, hasCampaign, hasLaunched }
  }, [accounts, state.emailAccountId, state.icp, state.importedContacts, state.campaignId, state.launched])

  const canNext = useMemo(() => {
    switch (state.step) {
      case 'prereq':
        return completion.hasAccount
      case 'icp':
        return completion.hasIcp
      case 'prospect':
        return completion.hasContacts
      case 'verify':
        return completion.hasVerified
      case 'campaign':
        return completion.hasCampaign
      case 'launch':
        return completion.hasLaunched
      default:
        return false
    }
  }, [state.step, completion])

  if (bootLoading || !state.hydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const meta = STEP_META[state.step]
  const Icon = meta.icon
  const isLast = state.step === 'launch'

  const checklist = [
    { key: 'account', label: t('gettingStarted.checklist.account'), done: completion.hasAccount },
    { key: 'icp', label: t('gettingStarted.checklist.icp'), done: completion.hasIcp },
    { key: 'contacts', label: t('gettingStarted.checklist.contacts'), done: completion.hasContacts },
    { key: 'verify', label: t('gettingStarted.checklist.verify'), done: completion.hasVerified },
    { key: 'campaign', label: t('gettingStarted.checklist.campaign'), done: completion.hasCampaign },
    { key: 'launch', label: t('gettingStarted.checklist.launch'), done: completion.hasLaunched },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('gettingStarted.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('gettingStarted.subtitle')}</p>
      </div>

      {/* Real completion checklist */}
      <div className="flex flex-wrap gap-2">
        {checklist.map((item) => (
          <span
            key={item.key}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
              item.done ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
            )}
          >
            {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            {item.label}
          </span>
        ))}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                // allow going back freely; forward only if previous completed via canNext chain is soft
                if (i <= state.stepIndex) state.goTo(s)
              }}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors',
                i < state.stepIndex
                  ? 'bg-green-500 text-white'
                  : i === state.stepIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
              )}
            >
              {i < state.stepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </button>
            {i < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  'h-1 flex-1 rounded-full',
                  i < state.stepIndex ? 'bg-green-500' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs font-medium text-gray-500">
        {t('gettingStarted.step', {
          current: String(state.stepIndex + 1),
          total: String(WIZARD_STEPS.length),
        })}{' '}
        · {t(`gettingStarted.steps.${state.step}.title`)}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5 text-primary" />
            {t(`gettingStarted.steps.${state.step}.title`)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">{t(`gettingStarted.steps.${state.step}.desc`)}</p>

          {state.step === 'prereq' && (
            <StepPrereq
              accounts={accounts}
              emailAccountId={state.emailAccountId}
              onSelectAccount={state.setEmailAccountId}
              onAccountsChange={setAccounts}
              onContinue={state.goNext}
            />
          )}
          {state.step === 'icp' && <StepIcp icp={state.icp} onChange={state.setIcp} />}
          {state.step === 'prospect' && (
            <StepProspect
              icp={state.icp}
              candidates={state.candidates}
              onCandidatesChange={state.setCandidates}
              importedContacts={state.importedContacts}
              onImported={state.mergeImported}
            />
          )}
          {state.step === 'verify' && (
            <StepVerify
              importedContacts={state.importedContacts}
              onUpdateContacts={state.setImportedContacts}
            />
          )}
          {state.step === 'campaign' && (
            <StepCampaign
              form={state.campaignForm}
              onChange={state.setCampaignForm}
              accounts={accounts}
              emailAccountId={state.emailAccountId}
              onSelectAccount={state.setEmailAccountId}
              importedContacts={state.importedContacts}
              campaignId={state.campaignId}
              onCampaignCreated={state.setCampaignId}
            />
          )}
          {state.step === 'launch' && (
            <StepLaunch
              campaignId={state.campaignId}
              launched={state.launched}
              onLaunched={() => state.setLaunched(true)}
              onReset={state.reset}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={state.goPrev}
          disabled={state.stepIndex === 0}
        >
          <ArrowLeft className="h-4 w-4" />
          {t('gettingStarted.prev')}
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={() => router.push('/dashboard')}>
            {t('gettingStarted.skip')}
          </Button>
          {!isLast && (
            <Button type="button" className="gap-2" onClick={state.goNext} disabled={!canNext}>
              {t('gettingStarted.next')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {isLast && state.launched && (
            <Button
              type="button"
              className="gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => router.push('/dashboard')}
            >
              <CheckCircle2 className="h-4 w-4" />
              {t('gettingStarted.finish')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
