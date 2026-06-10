'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/hooks/use-i18n'
import { Beaker, Plus, Trash2, ArrowRight, Trophy } from 'lucide-react'

interface ABVariant {
  id: string
  name: string
  subject: string
  content: string
  percentage: number
}

interface ABTestConfigProps {
  campaignId?: string
  onConfigChange?: (config: ABTestConfig) => void
}

interface ABTestConfig {
  enabled: boolean
  variants: ABVariant[]
  winnerMetric: 'open_rate' | 'click_rate' | 'reply_rate'
  sampleSize: number
  duration: number // hours
}

export function ABTestConfig({ campaignId, onConfigChange }: ABTestConfigProps) {
  const { addToast } = useToast()
  const { t } = useI18n()
  const [config, setConfig] = useState<ABTestConfig>({
    enabled: false,
    variants: [
      { id: 'a', name: 'Variant A (Control)', subject: '', content: '', percentage: 50 },
      { id: 'b', name: 'Variant B', subject: '', content: '', percentage: 50 },
    ],
    winnerMetric: 'open_rate',
    sampleSize: 100,
    duration: 24,
  })

  const [winner, setWinner] = useState<{ variant: string; metric: string; value: number } | null>(null)

  const updateConfig = (updates: Partial<ABTestConfig>) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)
    onConfigChange?.(newConfig)
  }

  const addVariant = () => {
    if (config.variants.length >= 4) {
      addToast({ type: 'error', title: t('abTest.maxVariants') })
      return
    }

    const newVariant: ABVariant = {
      id: String.fromCharCode(97 + config.variants.length),
      name: `Variant ${String.fromCharCode(65 + config.variants.length)}`,
      subject: '',
      content: '',
      percentage: Math.floor(100 / (config.variants.length + 1)),
    }

    // Redistribute percentages
    const newPercentage = Math.floor(100 / (config.variants.length + 1))
    const updatedVariants = config.variants.map(v => ({
      ...v,
      percentage: newPercentage,
    }))

    updateConfig({
      variants: [...updatedVariants, newVariant],
    })
  }

  const removeVariant = (id: string) => {
    if (config.variants.length <= 2) {
      addToast({ type: 'error', title: t('abTest.minVariants') })
      return
    }

    const filtered = config.variants.filter(v => v.id !== id)
    const newPercentage = Math.floor(100 / filtered.length)
    const updatedVariants = filtered.map(v => ({
      ...v,
      percentage: newPercentage,
    }))

    updateConfig({ variants: updatedVariants })
  }

  const updateVariant = (id: string, updates: Partial<ABVariant>) => {
    updateConfig({
      variants: config.variants.map(v =>
        v.id === id ? { ...v, ...updates } : v
      ),
    })
  }

  const simulateWinner = () => {
    // Simulate A/B test results
    const randomVariant = config.variants[Math.floor(Math.random() * config.variants.length)]
    const metrics = {
      open_rate: 15 + Math.random() * 30,
      click_rate: 5 + Math.random() * 15,
      reply_rate: 2 + Math.random() * 10,
    }

    setWinner({
      variant: randomVariant.name,
      metric: config.winnerMetric.replace('_', ' '),
      value: metrics[config.winnerMetric],
    })

    addToast({
      type: 'success',
      title: t('abTest.completed'),
      description: t('abTest.winnerVariant').replace('{variant}', randomVariant.name),
    })
  }

  return (
    <div className="space-y-6">
      {/* A/B Test Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5" />
            {t('abTest.config')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('abTest.enable')}</p>
              <p className="text-sm text-gray-500">
                {t('abTest.enableDesc')}
              </p>
            </div>
            <button
              onClick={() => updateConfig({ enabled: !config.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enabled ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {config.enabled && (
        <>
          {/* Variants */}
          {config.variants.map((variant, index) => (
            <Card key={variant.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{variant.name}</CardTitle>
                  {index >= 2 && (
                    <button
                      onClick={() => removeVariant(variant.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('abTest.subject')}</Label>
                  <Input
                    value={variant.subject}
                    onChange={(e) => updateVariant(variant.id, { subject: e.target.value })}
                    placeholder={t('abTest.subjectPlaceholder')}
                  />
                </div>
                <div>
                  <Label>{t('abTest.content')}</Label>
                  <Textarea
                    value={variant.content}
                    onChange={(e) => updateVariant(variant.id, { content: e.target.value })}
                    placeholder={t('abTest.contentPlaceholder')}
                    rows={4}
                  />
                </div>
                <div>
                  <Label>{t('abTest.trafficSplit')}: {variant.percentage}%</Label>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    value={variant.percentage}
                    onChange={(e) => updateVariant(variant.id, { percentage: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Variant Button */}
          {config.variants.length < 4 && (
            <Button variant="outline" onClick={addVariant} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {t('abTest.addVariant')}
            </Button>
          )}

          {/* Test Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('abTest.settings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('abTest.winnerMetric')}</Label>
                <select
                  value={config.winnerMetric}
                  onChange={(e) => updateConfig({ winnerMetric: e.target.value as any })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="open_rate">{t('abTest.metrics.openRate')}</option>
                  <option value="click_rate">{t('abTest.metrics.clickRate')}</option>
                  <option value="reply_rate">{t('abTest.metrics.replyRate')}</option>
                </select>
              </div>
              <div>
                <Label>{t('abTest.sampleSize')}</Label>
                <Input
                  type="number"
                  value={config.sampleSize}
                  onChange={(e) => updateConfig({ sampleSize: Number(e.target.value) })}
                  min={10}
                />
              </div>
              <div>
                <Label>{t('abTest.duration')}</Label>
                <Input
                  type="number"
                  value={config.duration}
                  onChange={(e) => updateConfig({ duration: Number(e.target.value) })}
                  min={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Simulate Winner */}
          <Button onClick={simulateWinner} className="w-full">
            <Trophy className="h-4 w-4 mr-2" />
            {t('abTest.simulate')}
          </Button>

          {/* Winner Display */}
          {winner && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">{t('abTest.winner')}: {winner.variant}</p>
                    <p className="text-sm text-green-600">
                      {winner.metric}: {winner.value.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
