'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useCampaignWizardStore, type ToneType } from '@/store/campaign-wizard-store'
import {
  ArrowLeft, Sparkles, Loader2, Copy, Check, Variable,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  CampaignAttachmentPicker,
  type CampaignAttachmentItem,
} from '@/components/campaign-wizard/CampaignAttachmentPicker'
import { getFirstEmailStep, serializeSequenceForApi, validateWizardSequence } from '@/lib/sequence-utils'
import { getLanguageName } from '@/lib/i18n/languages'
import { useI18n } from '@/hooks/use-i18n'

const TONE_IDS: { id: ToneType; key: string; emoji: string }[] = [
  { id: 'professional', key: 'campaignWizard.tone.professional', emoji: '💼' },
  { id: 'warm', key: 'campaignWizard.tone.warm', emoji: '🤝' },
  { id: 'concise', key: 'campaignWizard.tone.concise', emoji: '⚡' },
  { id: 'urgent', key: 'campaignWizard.tone.urgent', emoji: '🔥' },
]

const VARIABLE_DEFS = [
  { token: '{{FirstName}}', key: 'campaignWizard.variable.firstName' },
  { token: '{{LastName}}', key: 'campaignWizard.variable.lastName' },
  { token: '{{CompanyName}}', key: 'campaignWizard.variable.companyName' },
  { token: '{{Country}}', key: 'campaignWizard.variable.country' },
  { token: '{{Industry}}', key: 'campaignWizard.variable.industry' },
]

export function StepAiWriter() {
  const {
    productPrompt, setProductPrompt,
    tone, setTone,
    language,
    generatedEmail, setGeneratedEmail,
    isGenerating, setIsGenerating,
    prevStep,
    campaignName, targetTags, pastedEmails, selectedContactIds,
    audienceTab, senderAccountId,
    productId,
    campaignType, sequence,
    variantBSubject, variantBContent,
    scheduleType, scheduledAt, recurrenceRule, timezone,
    windowStart, windowEnd,
  } = useCampaignWizardStore()

  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState('')
  const [attachments, setAttachments] = useState<CampaignAttachmentItem[]>([])
  const textareaRef = { current: null as HTMLTextAreaElement | null }
  const { t } = useI18n()

  /** 从粘贴邮箱解析或查找/创建联系人，返回 contactIds */
  async function resolveContactIds(): Promise<string[]> {
    if (audienceTab === 'contacts') {
      return selectedContactIds
    }

    const emails = pastedEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e.includes('@'))

    const ids: string[] = []

    for (const email of emails) {
      // 先查是否已有联系人
      const searchRes = await fetch(`/api/contacts?search=${encodeURIComponent(email)}&limit=5`)
      const searchJson = await searchRes.json()
      const existing = searchJson.success
        ? (searchJson.data || []).find((c: any) =>
            c.emails?.some((e: any) => e.address.toLowerCase() === email)
          )
        : null

      if (existing) {
        ids.push(existing.id)
        continue
      }

      // 创建简易联系人
      const localPart = email.split('@')[0]
      const createRes = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: localPart,
          emails: [email],
          tags: targetTags ? targetTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        }),
      })
      const createJson = await createRes.json()
      if (createJson.success && createJson.data?.id) {
        ids.push(createJson.data.id)
      }
    }

    return ids
  }

  const isSequence = campaignType === 'SEQUENCE'
  const isAbTest = campaignType === 'AB_TEST'
  const sequenceReady = isSequence && validateWizardSequence(sequence)
  const abReady =
    isAbTest &&
    !!generatedEmail.trim() &&
    !!variantBSubject.trim() &&
    !!variantBContent.trim()
  const singleReady = campaignType === 'SINGLE' && !!generatedEmail.trim()
  const canLaunch = !!senderAccountId && (sequenceReady || singleReady || abReady)

  const handleLaunch = async () => {
    if (!canLaunch) return
    setLaunching(true)
    setLaunchError('')

    try {
      const contactIds = await resolveContactIds()
      if (contactIds.length === 0) {
        setLaunchError(t('campaignWizard.error.noRecipients'))
        return
      }

      let subjectLine: string
      let emailContent: string
      let htmlContent: string

      if (isSequence) {
        const firstStep = getFirstEmailStep(sequence)
        if (!firstStep) {
          setLaunchError(t('campaignWizard.error.sequenceNeedsEmail'))
          return
        }
        subjectLine = firstStep.subject.trim()
        emailContent = firstStep.content
        htmlContent = firstStep.htmlContent || firstStep.content.replace(/\n/g, '<br/>')
      } else {
        const lines = generatedEmail.trim().split('\n').filter(Boolean)
        subjectLine =
          lines.find((l) => !l.startsWith('{{') && l.length < 120) || `Re: ${campaignName}`
        emailContent = generatedEmail
        htmlContent = generatedEmail.replace(/\n/g, '<br/>')
      }

      const sendingWindows = { start: windowStart, end: windowEnd }

      const createPayload: Record<string, unknown> = {
        name: campaignName,
        subject: subjectLine,
        content: emailContent,
        htmlContent,
        emailAccountId: senderAccountId,
        contactIds,
        type: campaignType,
        status: 'DRAFT',
        scheduleType,
        timezone,
        sendingWindows,
      }
      // #52: 传递产品关联
      if (productId) createPayload.productId = productId
      if (attachments.length > 0) {
        createPayload.attachmentIds = attachments.map((a) => a.id)
      }

      // #7: SEQUENCE 类型传递完整步骤配置（含 wait/condition）
      if (campaignType === 'SEQUENCE' && sequence.length > 0) {
        createPayload.sequence = serializeSequenceForApi(sequence)
      }

      // #8: A/B 测试变体 B 配置
      if (campaignType === 'AB_TEST' && variantBSubject && variantBContent) {
        createPayload.abTestEnabled = true
        createPayload.sequence = [
          { subject: subjectLine, content: emailContent, htmlContent, variant: 'A' },
          { subject: variantBSubject, content: variantBContent, htmlContent: variantBContent.replace(/\n/g, '<br/>'), variant: 'B' },
        ]
      }

      if (scheduleType === 'RECURRING') {
        createPayload.recurrenceRule = recurrenceRule
      }
      if (scheduleType === 'SCHEDULED' && scheduledAt) {
        createPayload.scheduledAt = new Date(scheduledAt).toISOString()
      }

      const createRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload),
      })
      const createJson = await createRes.json()
      if (!createRes.ok || !createJson.success) {
        setLaunchError(createJson.error?.message || createJson.message || t('campaignWizard.error.createFailed'))
        return
      }

      const launchBody: Record<string, unknown> = {}
      if (scheduleType === 'SCHEDULED' && scheduledAt) {
        launchBody.scheduledAt = new Date(scheduledAt).toISOString()
      }

      const launchRes = await fetch(`/api/campaigns/${createJson.data.id}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(launchBody),
      })
      const launchJson = await launchRes.json()
      if (!launchRes.ok || !launchJson.success) {
        setLaunchError(launchJson.error?.message || launchJson.message || t('campaignWizard.error.launchFailed'))
        router.push('/campaigns')
        return
      }

      if (launchJson.warnings?.length) {
        toast.warning(launchJson.warnings[0])
      }

      router.push('/campaigns')
    } catch (e) {
      console.error('Launch failed:', e)
      setLaunchError(t('campaignWizard.error.launchRetry'))
    } finally {
      setLaunching(false)
    }
  }

  const handleGenerate = async () => {
    if (!productPrompt.trim()) return
    setIsGenerating(true)
    setGeneratedEmail('')

    try {
      const res = await fetch('/api/campaigns/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productPrompt, tone, targetTags, productId, language: getLanguageName(language) }),
      })
      const data = await res.json()
      if (data.success) {
        setGeneratedEmail(data.data.email)
      }
    } catch {
      setGeneratedEmail(t('campaignWizard.error.generateFailed'))
    } finally {
      setIsGenerating(false)
    }
  }

  const insertVariable = (token: string) => {
    const el = textareaRef.current
    if (!el) {
      setGeneratedEmail(generatedEmail + token)
      return
    }
    const start = el.selectionStart ?? generatedEmail.length
    const end = el.selectionEnd ?? generatedEmail.length
    const before = generatedEmail.slice(0, start)
    const after = generatedEmail.slice(end)
    const next = before + token + after
    setGeneratedEmail(next)
    // Restore cursor after token
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedEmail)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalAudience = pastedEmails
    .split(/[\n,;]+/)
    .filter((e) => e.trim() && e.includes('@')).length + selectedContactIds.length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {isSequence ? t('campaignWizard.aiWriter.titleSequence') : isAbTest ? t('campaignWizard.aiWriter.titleAbTest') : t('campaignWizard.aiWriter.titleSingle')}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isSequence
            ? t('campaignWizard.aiWriter.descSequence', { count: sequence.length })
            : isAbTest
              ? t('campaignWizard.aiWriter.descAbTest')
              : t('campaignWizard.aiWriter.descSingle')}
        </p>
      </div>

      {isSequence && sequenceReady && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2">
          <p className="text-sm font-medium text-gray-800">{t('campaignWizard.aiWriter.sequencePreview')}</p>
          {sequence.map((step, idx) => (
            <div key={idx} className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">{t('campaignWizard.aiWriter.emailNumber', { number: idx + 1 })}</span>
              {step.subject || t('campaignWizard.aiWriter.noSubject')}
              {idx > 0 && (
                <span className="ml-2 text-xs text-gray-400">（+{step.delayHours}h）</span>
              )}
            </div>
          ))}
        </div>
      )}

      <CampaignAttachmentPicker attachments={attachments} onChange={setAttachments} />

      {/* Product prompt */}
      <div className="space-y-2">
        <Label htmlFor="productPrompt">{t('campaignWizard.aiWriter.productLabel')}</Label>
        <Textarea
          id="productPrompt"
          rows={4}
          placeholder={t('campaignWizard.aiWriter.productPlaceholder')}
          value={productPrompt}
          onChange={(e) => setProductPrompt(e.target.value)}
        />
      </div>

      {/* Tone selector */}
      <div className="space-y-2">
        <Label>{t('campaignWizard.aiWriter.toneLabel')}</Label>
        <div className="flex flex-wrap gap-2">
          {TONE_IDS.map((toneItem) => (
            <button
              key={toneItem.id}
              type="button"
              onClick={() => setTone(toneItem.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300',
                tone === toneItem.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
              )}
            >
              <span>{toneItem.emoji}</span>
              {t(toneItem.key)}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <Button
        type="button"
        onClick={handleGenerate}
        disabled={!productPrompt.trim() || isGenerating}
        className="gap-2"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('campaignWizard.aiWriter.generating')}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {t('campaignWizard.aiWriter.generate')}
          </>
        )}
      </Button>

      {/* Loading animation */}
      {isGenerating && (
        <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-4">
          <div className="flex gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:300ms]" />
          </div>
          <span className="text-sm text-blue-700">{t('campaignWizard.aiWriter.analyzing')}</span>
        </div>
      )}

      {/* Generated email editor */}
      {generatedEmail && !isGenerating && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="generatedEmail">{t('campaignWizard.aiWriter.generatedEmail')}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-green-600" />
                  {t('campaignWizard.aiWriter.copied')}
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  {t('campaignWizard.aiWriter.copy')}
                </>
              )}
            </Button>
          </div>

          {/* Variable insert chips */}
          <div className="flex flex-wrap items-center gap-2">
            <Variable className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">{t('campaignWizard.aiWriter.insertVariable')}</span>
            {VARIABLE_DEFS.map((v) => (
              <button
                key={v.token}
                type="button"
                onClick={() => insertVariable(v.token)}
                className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-mono text-blue-600 transition-all hover:border-blue-300 hover:bg-blue-50"
              >
                {v.token}
              </button>
            ))}
          </div>

          <Textarea
            ref={(el) => { textareaRef.current = el }}
            id="generatedEmail"
            rows={14}
            value={generatedEmail}
            onChange={(e) => setGeneratedEmail(e.target.value)}
            className="font-mono text-sm leading-relaxed"
          />

          <p className="text-xs text-gray-400">
            {t('campaignWizard.aiWriter.variableHint')}
          </p>
        </div>
      )}

      {/* Summary & back & Launch */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-6">
        <Button type="button" variant="outline" onClick={prevStep} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('campaignWizard.prev')}
        </Button>
        <div className="flex items-center gap-6">
          <div className="text-right text-sm text-gray-500">
            <p>{t('campaignWizard.task')}: {campaignName || t('campaignWizard.unnamed')}</p>
            <p>{t('campaignWizard.recipients')}: {totalAudience} {t('campaignWizard.recipientsSuffix')}</p>
          </div>
          <Button
            type="button"
            onClick={handleLaunch}
            disabled={launching || !canLaunch}
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            size="lg"
          >
            {launching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('campaignWizard.launching')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {isSequence ? t('campaignWizard.launchSequence') : t('campaignWizard.launchCampaign')}
              </>
            )}
          </Button>
        </div>
      </div>
      {launchError && (
        <p className="text-sm text-red-600 text-right">{launchError}</p>
      )}
    </div>
  )
}
