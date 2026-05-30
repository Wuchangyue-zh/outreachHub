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

const TONES: { id: ToneType; label: string; emoji: string }[] = [
  { id: 'professional', label: '专业', emoji: '💼' },
  { id: 'warm', label: '热烈', emoji: '🤝' },
  { id: 'concise', label: '极简', emoji: '⚡' },
  { id: 'urgent', label: '催款', emoji: '🔥' },
]

const VARIABLES = [
  { token: '{{FirstName}}', label: '名' },
  { token: '{{LastName}}', label: '姓' },
  { token: '{{CompanyName}}', label: '公司名' },
  { token: '{{Country}}', label: '国家' },
  { token: '{{Industry}}', label: '行业' },
]

export function StepAiWriter() {
  const {
    productPrompt, setProductPrompt,
    tone, setTone,
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
  const textareaRef = { current: null as HTMLTextAreaElement | null }

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
  const sequenceReady =
    isSequence &&
    sequence.length > 0 &&
    sequence.every((s) => s.subject.trim() && s.content.trim())
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
        setLaunchError('没有有效的收件人，请返回上一步添加联系人')
        return
      }

      let subjectLine: string
      let emailContent: string
      let htmlContent: string

      if (isSequence) {
        const firstStep = sequence[0]
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

      // #7: SEQUENCE 类型传递步骤配置
      if (campaignType === 'SEQUENCE' && sequence.length > 0) {
        createPayload.sequence = sequence.map((step, idx) => ({
          subject: step.subject,
          content: step.content,
          htmlContent: step.content.replace(/\n/g, '<br/>'),
          delayHours: idx === 0 ? 0 : step.delayHours,
        }))
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
        setLaunchError(createJson.message || createJson.error || '创建活动失败')
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
        setLaunchError(launchJson.message || launchJson.error || '启动活动失败')
        router.push('/campaigns')
        return
      }

      router.push('/campaigns')
    } catch (e) {
      console.error('Launch failed:', e)
      setLaunchError('启动失败，请稍后重试')
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
        body: JSON.stringify({ productPrompt, tone, targetTags, productId }),
      })
      const data = await res.json()
      if (data.success) {
        setGeneratedEmail(data.data.email)
      }
    } catch {
      setGeneratedEmail('生成失败，请重试。')
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
          {isSequence ? '确认并启动序列' : isAbTest ? '确认 A/B 测试并启动' : 'AI 开发信撰写'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {isSequence
            ? `已在第一步配置 ${sequence.length} 封邮件序列，可直接启动；也可选用 AI 润色第一封内容`
            : isAbTest
              ? '变体 A 使用下方 AI 生成内容，变体 B 已在第一步配置；48 小时后按打开率自动选 winner'
              : '描述你的产品优势，AI 帮你生成专业的英文开发信'}
        </p>
      </div>

      {isSequence && sequenceReady && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2">
          <p className="text-sm font-medium text-gray-800">序列预览</p>
          {sequence.map((step, idx) => (
            <div key={idx} className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">第 {idx + 1} 封：</span>
              {step.subject || '（无主题）'}
              {idx > 0 && (
                <span className="ml-2 text-xs text-gray-400">（+{step.delayHours}h）</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Product prompt */}
      <div className="space-y-2">
        <Label htmlFor="productPrompt">核心产品 / 公司优势 *</Label>
        <Textarea
          id="productPrompt"
          rows={4}
          placeholder="例：我们是一家专业生产汽车轴承的工厂，通过 IATF16949 认证，产品出口 30+ 国家，交期 15 天，支持 OEM 定制..."
          value={productPrompt}
          onChange={(e) => setProductPrompt(e.target.value)}
        />
      </div>

      {/* Tone selector */}
      <div className="space-y-2">
        <Label>邮件语调</Label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTone(t.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300',
                tone === t.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
              )}
            >
              <span>{t.emoji}</span>
              {t.label}
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
            AI 正在撰写中...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            AI 帮我写信
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
          <span className="text-sm text-blue-700">正在分析您的产品特点并生成个性化开发信...</span>
        </div>
      )}

      {/* Generated email editor */}
      {generatedEmail && !isGenerating && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="generatedEmail">生成的开发信</Label>
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
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  复制
                </>
              )}
            </Button>
          </div>

          {/* Variable insert chips */}
          <div className="flex flex-wrap items-center gap-2">
            <Variable className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">插入变量：</span>
            {VARIABLES.map((v) => (
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
            可自由编辑内容，变量将在发送时自动替换为收件人信息
          </p>
        </div>
      )}

      {/* Summary & back & Launch */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-6">
        <Button type="button" variant="outline" onClick={prevStep} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          上一步
        </Button>
        <div className="flex items-center gap-6">
          <div className="text-right text-sm text-gray-500">
            <p>任务：{campaignName || '未命名'}</p>
            <p>收件人：{totalAudience} 位</p>
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
                启动中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {isSequence ? 'Launch Sequence' : 'Launch Campaign'}
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
