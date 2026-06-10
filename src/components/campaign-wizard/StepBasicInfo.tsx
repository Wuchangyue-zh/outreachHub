'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useCampaignWizardStore } from '@/store/campaign-wizard-store'
import { ArrowRight, Mail, Loader2, AlertCircle, Plus, Trash2, Clock, Package, Layers } from 'lucide-react'
import Link from 'next/link'
import { SequenceBuilder } from '@/components/sequence-builder'
import { validateWizardSequence } from '@/lib/sequence-utils'
import { LANGUAGES } from '@/lib/i18n/languages'
import { useI18n } from '@/hooks/use-i18n'

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
    language, setLanguage,
    targetTags, setTargetTags,
    senderAccountId, setSenderAccountId,
    productId, setProductId,
    campaignType, setCampaignType,
    variantBSubject, setVariantBSubject,
    variantBContent, setVariantBContent,
    sequence, addSequenceStep, removeSequenceStep, updateSequenceStep,
    scheduleType, setScheduleType,
    scheduledAt, setScheduledAt,
    recurrenceRule, setRecurrenceRule,
    timezone, setTimezone,
    windowStart, setWindowStart,
    windowEnd, setWindowEnd,
    nextStep,
  } = useCampaignWizardStore()

  const { t } = useI18n()

  interface ProductOption {
    id: string
    name: string
    category: string | null
    price: number | null
    currency: string
  }

  const [accounts, setAccounts] = useState<EmailAccountOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/email-accounts').then((r) => r.json()),
      fetch('/api/products?limit=100').then((r) => r.json()),
    ])
      .then(([accountsJson, productsJson]) => {
        if (accountsJson.success) {
          const active = (accountsJson.data as EmailAccountOption[]).filter((a) => a.isActive)
          setAccounts(active)
          if (active.length === 1 && !senderAccountId) {
            setSenderAccountId(active[0].id)
          }
        }
        if (productsJson.success) {
          setProducts(productsJson.data.products || [])
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [senderAccountId, setSenderAccountId])

  // #7: SEQUENCE 至少一个有效 email 步骤；wait/condition 单独校验
  const sequenceValid =
    campaignType !== 'SEQUENCE' || validateWizardSequence(sequence)

  // #8: AB_TEST 需要变体 B 内容
  const abValid =
    campaignType !== 'AB_TEST' ||
    (variantBSubject.trim() && variantBContent.trim())

  const canProceed =
    campaignName.trim() &&
    senderAccountId &&
    sequenceValid &&
    abValid &&
    (scheduleType !== 'SCHEDULED' || !!scheduledAt) &&
    (scheduleType !== 'RECURRING' || windowStart < windowEnd)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{t('campaignWizard.basic.title')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('campaignWizard.basic.subtitle')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaignName">{t('campaignWizard.basic.nameLabel')}</Label>
        <Input
          id="campaignName"
          placeholder={t('campaignWizard.basic.namePlaceholder')}
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="language">{t('campaignWizard.basic.language')}</Label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeName} ({lang.name})
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400">{t('campaignWizard.basic.languageHint')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetTags">{t('campaignWizard.basic.targetTags')}</Label>
        <Input
          id="targetTags"
          placeholder={t('campaignWizard.basic.tagsPlaceholder')}
          value={targetTags}
          onChange={(e) => setTargetTags(e.target.value)}
        />
        <p className="text-xs text-gray-400">{t('campaignWizard.basic.tagsHint')}</p>
      </div>

      {/* #52: 产品关联（可选） */}
      {products.length > 0 && (
        <div className="space-y-2">
          <Label>{t('campaignWizard.basic.product')}</Label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => setProductId('')}
              className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-300 ${
                !productId
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-500">{t('campaignWizard.basic.noProduct')}</p>
              </div>
            </button>
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProductId(p.id)}
                className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-300 ${
                  productId === p.id
                    ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-100'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    productId === p.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Package className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{p.name}</p>
                  {p.category && (
                    <p className="truncate text-xs text-gray-500">{p.category}</p>
                  )}
                  {p.price != null && (
                    <p className="text-xs text-gray-400">{p.price} {p.currency}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">{t('campaignWizard.basic.productHint')}</p>
        </div>
      )}

      {/* #7: 活动类型选择 */}
      <div className="space-y-3">
        <Label>{t('campaignWizard.basic.campaignType')}</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { id: 'SINGLE', label: t('campaignWizard.type.single'), desc: t('campaignWizard.type.singleDesc') },
              { id: 'SEQUENCE', label: t('campaignWizard.type.sequence'), desc: t('campaignWizard.type.sequenceDesc') },
              { id: 'AB_TEST', label: t('campaignWizard.type.abTest'), desc: t('campaignWizard.type.abTestDesc') },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setCampaignType(opt.id)}
              className={`rounded-lg border p-3 text-left transition-all ${
                campaignType === opt.id
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
              <p className="mt-0.5 text-xs text-gray-500">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* O1d: 可视化序列编辑器 */}
      {campaignType === 'SEQUENCE' && (
        <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/30 p-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600" />
            <Label className="text-sm font-semibold text-blue-800">{t('campaignWizard.basic.sequenceEditor')}</Label>
          </div>
          <SequenceBuilder />
        </div>
      )}

      {/* #8: A/B 测试变体 B 编辑器 */}
      {campaignType === 'AB_TEST' && (
        <div className="space-y-3 rounded-xl border border-purple-100 bg-purple-50/30 p-4">
          <Label>{t('campaignWizard.basic.variantBLabel')}</Label>
          <Input
            placeholder={t('campaignWizard.basic.variantBSubject')}
            value={variantBSubject}
            onChange={(e) => setVariantBSubject(e.target.value)}
            className="text-sm"
          />
          <Textarea
            placeholder={t('campaignWizard.basic.variantBContent')}
            value={variantBContent}
            onChange={(e) => setVariantBContent(e.target.value)}
            rows={6}
            className="text-sm font-mono"
          />
          <p className="text-xs text-gray-500">{t('campaignWizard.basic.abTestHint')}</p>
        </div>
      )}

      <div className="space-y-3">
        <Label>{t('campaignWizard.basic.senderAccount')}</Label>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('campaignWizard.basic.loadingAccounts')}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">{t('campaignWizard.basic.noAccount')}</p>
              <p className="mt-1 text-amber-700">
                {t('campaignWizard.basic.noAccountHint').includes('邮箱设置')
                  ? <>
                      {t('campaignWizard.basic.noAccountHint').split('邮箱设置')[0]}
                      <Link href="/dashboard/settings" className="underline font-medium">{t('campaignWizard.basic.emailSettings')}</Link>
                      {t('campaignWizard.basic.noAccountHint').split('邮箱设置')[1]}
                    </>
                  : t('campaignWizard.basic.noAccountHint')}
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
                    {t('campaignWizard.basic.today')} {sender.dailySent}/{sender.dailyLimit}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
        <Label>{t('campaignWizard.basic.scheduleType')}</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              { id: 'IMMEDIATE', label: t('campaignWizard.schedule.immediate'), desc: t('campaignWizard.schedule.immediateDesc') },
              { id: 'SCHEDULED', label: t('campaignWizard.schedule.scheduled'), desc: t('campaignWizard.schedule.scheduledDesc') },
              { id: 'RECURRING', label: t('campaignWizard.schedule.recurring'), desc: t('campaignWizard.schedule.recurringDesc') },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setScheduleType(opt.id)}
              className={`rounded-lg border p-3 text-left transition-all ${
                scheduleType === opt.id
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
              <p className="mt-0.5 text-xs text-gray-500">{opt.desc}</p>
            </button>
          ))}
        </div>

        {scheduleType === 'SCHEDULED' && (
          <div className="space-y-2">
            <Label htmlFor="scheduledAt">{t('campaignWizard.basic.scheduledAt')}</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        )}

        {scheduleType === 'RECURRING' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recurrenceRule">{t('campaignWizard.basic.recurrence')}</Label>
              <select
                id="recurrenceRule"
                value={recurrenceRule}
                onChange={(e) => setRecurrenceRule(e.target.value as typeof recurrenceRule)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="daily">{t('campaignWizard.recurrence.daily')}</option>
                <option value="weekly">{t('campaignWizard.recurrence.weekly')}</option>
                <option value="monthly">{t('campaignWizard.recurrence.monthly')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">{t('campaignWizard.basic.timezone')}</Label>
              <Input
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Asia/Shanghai"
              />
            </div>
          </div>
        )}

        {(scheduleType === 'RECURRING' || scheduleType === 'SCHEDULED') && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="windowStart">{t('campaignWizard.basic.windowStart')}</Label>
              <Input
                id="windowStart"
                type="time"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="windowEnd">{t('campaignWizard.basic.windowEnd')}</Label>
              <Input
                id="windowEnd"
                type="time"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
              />
            </div>
          </div>
        )}
        {scheduleType === 'RECURRING' && windowStart >= windowEnd && (
          <p className="text-xs text-red-600">{t('campaignWizard.basic.windowError')}</p>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={nextStep} disabled={!canProceed} className="gap-2">
          {t('campaignWizard.basic.next')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
