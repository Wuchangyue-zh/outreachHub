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
  } = useCampaignWizardStore()

  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [cursorPos, setCursorPos] = useState<number | null>(null)
  const textareaRef = { current: null as HTMLTextAreaElement | null }

  const handleLaunch = () => {
    setLaunching(true)
    // Mock save — in production this would POST to /api/campaigns
    setTimeout(() => {
      router.push('/campaigns')
    }, 600)
  }

  const handleGenerate = async () => {
    if (!productPrompt.trim()) return
    setIsGenerating(true)
    setGeneratedEmail('')

    try {
      const res = await fetch('/api/campaigns/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productPrompt, tone, targetTags }),
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
        <h2 className="text-lg font-bold text-gray-900">AI 开发信撰写</h2>
        <p className="mt-1 text-sm text-gray-500">
          描述你的产品优势，AI 帮你生成专业的英文开发信
        </p>
      </div>

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
            onClick={(e) => {
              const target = e.target as HTMLTextAreaElement
              setCursorPos(target.selectionStart)
            }}
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
            disabled={launching}
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
                Launch Campaign
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
