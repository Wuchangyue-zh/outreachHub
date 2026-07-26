'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Tag, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorMessage, fetchJson } from './api'
import { IcpData } from './types'

type Props = {
  icp: IcpData
  onChange: (icp: IcpData) => void
}

export function StepIcp({ icp, onChange }: Props) {
  const [suggesting, setSuggesting] = useState(false)
  const [suggestError, setSuggestError] = useState('')

  const handleSuggest = async () => {
    const industry = icp.industry.trim() || icp.keywords.split(',')[0]?.trim()
    if (!industry) {
      setSuggestError('请先填写行业或关键词')
      return
    }
    setSuggestError('')
    setSuggesting(true)
    try {
      const { ok, data } = await fetchJson<{
        success: boolean
        data?: { suggestions?: string[] }
      }>('/api/prospecting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'suggest-keywords',
          params: {
            industry,
            existingKeywords: icp.keywords
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          },
        }),
      })
      if (!ok || !data.success) {
        setSuggestError(apiErrorMessage(data, 'AI 拓词失败（可跳过，手动填写）'))
        return
      }
      const suggestions = data.data?.suggestions || []
      if (suggestions.length === 0) {
        setSuggestError('未返回建议，请手动填写关键词')
        return
      }
      const existing = icp.keywords
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const merged = [...new Set([...existing, ...suggestions])]
      onChange({ ...icp, keywords: merged.join(', ') })
    } catch {
      setSuggestError('网络错误')
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        定义理想客户画像。至少填写「目标行业」或「关键词」之一，后续获客将据此搜索。
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>目标行业</Label>
          <Input
            placeholder="例：汽车零部件、LED 照明"
            value={icp.industry}
            onChange={(e) => onChange({ ...icp, industry: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>目标国家</Label>
          <Input
            placeholder="例：Germany, United States"
            value={icp.country}
            onChange={(e) => onChange({ ...icp, country: e.target.value })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <Label>
              <Tag className="mr-1 inline h-3.5 w-3.5" />
              关键词
            </Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={suggesting}
              onClick={handleSuggest}
            >
              {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI 拓词
            </Button>
          </div>
          <Input
            placeholder="例：automotive parts, LED"
            value={icp.keywords}
            onChange={(e) => onChange({ ...icp, keywords: e.target.value })}
          />
          {suggestError && <p className="text-xs text-amber-700">{suggestError}</p>}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>
            <Globe className="mr-1 inline h-3.5 w-3.5" />
            海关 HS 编码（可选，进阶用）
          </Label>
          <Input
            placeholder="例：8471.30"
            value={icp.hsCode}
            onChange={(e) => onChange({ ...icp, hsCode: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}
