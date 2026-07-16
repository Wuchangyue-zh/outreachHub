'use client'

import { useState, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  ArrowRight,
  Rocket,
  Search,
  ShieldCheck,
  Send,
  BarChart3,
  Ship,
  Globe,
  Tag,
  Lightbulb,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { useI18n } from '@/hooks/use-i18n'
import { cn } from '@/lib/utils'

// §9.61: 使用 useSearchParams 预填搜索条件，需强制动态渲染
export const dynamic = 'force-dynamic'

type IcpData = {
  industry: string
  country: string
  keywords: string
  hsCode: string
}

const STEPS = ['icp', 'prospect', 'verify', 'campaign', 'launch'] as const
const TOTAL = STEPS.length

function GettingStartedContent() {
  const { t } = useI18n()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [icp, setIcp] = useState<IcpData>({ industry: '', country: '', keywords: '', hsCode: '' })

  const stepKey = STEPS[step]
  const isLast = step === TOTAL - 1

  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, TOTAL - 1)), [])
  const goPrev = useCallback(() => setStep((s) => Math.max(s - 1, 0)), [])

  const wb = t(`gettingStarted.steps.${stepKey}`) as unknown as Record<string, string>

  const searchParams = new URLSearchParams()
  if (icp.keywords) searchParams.set('keyword', icp.keywords)
  if (icp.country) searchParams.set('country', icp.country)
  if (icp.industry) searchParams.set('industry', icp.industry)
  if (icp.hsCode) searchParams.set('hsCode', icp.hsCode)
  const qp = searchParams.toString()

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 py-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('gettingStarted.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('gettingStarted.subtitle')}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  i < step ? 'bg-green-500 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                )}
              >
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              {i < TOTAL - 1 && (
                <div className={cn('h-1 flex-1 rounded-full', i < step ? 'bg-green-500' : 'bg-gray-200')} />
              )}
            </div>
          ))}
        </div>
        <p className="text-xs font-medium text-gray-500">
          {t('gettingStarted.step', { current: String(step + 1), total: String(TOTAL) })} · {wb.title}
        </p>

        {/* Step content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {stepKey === 'icp' && <Lightbulb className="h-5 w-5 text-amber-500" />}
              {stepKey === 'prospect' && <Search className="h-5 w-5 text-blue-500" />}
              {stepKey === 'verify' && <ShieldCheck className="h-5 w-5 text-green-500" />}
              {stepKey === 'campaign' && <Send className="h-5 w-5 text-purple-500" />}
              {stepKey === 'launch' && <BarChart3 className="h-5 w-5 text-indigo-500" />}
              {wb.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-gray-600">{wb.desc}</p>

            {/* Step 1: ICP */}
            {stepKey === 'icp' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{wb.industry}</Label>
                  <Input
                    placeholder={wb.industryPlaceholder}
                    value={icp.industry}
                    onChange={(e) => setIcp({ ...icp, industry: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{wb.country}</Label>
                  <Input
                    placeholder={wb.countryPlaceholder}
                    value={icp.country}
                    onChange={(e) => setIcp({ ...icp, country: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    <Tag className="mr-1 inline h-3.5 w-3.5" />
                    {wb.keywords}
                  </Label>
                  <Input
                    placeholder={wb.keywordsPlaceholder}
                    value={icp.keywords}
                    onChange={(e) => setIcp({ ...icp, keywords: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    <Globe className="mr-1 inline h-3.5 w-3.5" />
                    {wb.hsCode}
                  </Label>
                  <Input
                    placeholder={wb.hsCodePlaceholder}
                    value={icp.hsCode}
                    onChange={(e) => setIcp({ ...icp, hsCode: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Prospect */}
            {stepKey === 'prospect' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-blue-100 bg-blue-50/40">
                  <CardContent className="space-y-3 p-5">
                    <Search className="h-8 w-8 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{wb.prospectingTitle}</h3>
                    <p className="text-sm text-gray-600">{wb.prospectingDesc}</p>
                    <Button className="w-full gap-2" onClick={() => router.push(`/prospecting${qp ? `?${qp}` : ''}`)}>
                      <Rocket className="h-4 w-4" />
                      {wb.prospectingTitle}
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-teal-100 bg-teal-50/40">
                  <CardContent className="space-y-3 p-5">
                    <Ship className="h-8 w-8 text-teal-600" />
                    <h3 className="font-semibold text-gray-900">{wb.customsTitle}</h3>
                    <p className="text-sm text-gray-600">{wb.customsDesc}</p>
                    <Button className="w-full gap-2" variant="outline" onClick={() => router.push(`/customs${qp ? `?${qp}` : ''}`)}>
                      <Ship className="h-4 w-4" />
                      {wb.customsTitle}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Verify */}
            {stepKey === 'verify' && (
              <div className="space-y-4 rounded-lg border border-green-100 bg-green-50/40 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">{wb.verifyHint}</p>
                    <Button variant="outline" className="gap-2" onClick={() => router.push('/contacts')}>
                      <ShieldCheck className="h-4 w-4" />
                      {wb.batchVerify}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Campaign */}
            {stepKey === 'campaign' && (
              <div className="space-y-4 rounded-lg border border-purple-100 bg-purple-50/40 p-4">
                <div className="flex items-start gap-3">
                  <Send className="mt-0.5 h-6 w-6 shrink-0 text-purple-600" />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">{wb.campaignHint}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button className="gap-2" onClick={() => router.push('/campaigns/new')}>
                        <Send className="h-4 w-4" />
                        {wb.createCampaign}
                      </Button>
                      <Button variant="outline" className="gap-2" onClick={() => router.push('/campaigns/new')}>
                        <Rocket className="h-4 w-4" />
                        {wb.createSequence}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Launch */}
            {stepKey === 'launch' && (
              <div className="space-y-4 rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
                <div className="flex items-start gap-3">
                  <BarChart3 className="mt-0.5 h-6 w-6 shrink-0 text-indigo-600" />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">{wb.launchHint}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button className="gap-2" onClick={() => router.push('/campaigns')}>
                        <BarChart3 className="h-4 w-4" />
                        {wb.viewCampaigns}
                      </Button>
                      <Button variant="outline" className="gap-2" onClick={() => router.push('/deliverability')}>
                        <ShieldCheck className="h-4 w-4" />
                        {wb.viewDeliverability}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" className="gap-2" onClick={goPrev} disabled={step === 0}>
            <ArrowLeft className="h-4 w-4" />
            {t('gettingStarted.prev')}
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => router.push('/dashboard')}>
              {t('gettingStarted.skip')}
            </Button>
            {isLast ? (
              <Button type="button" className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => router.push('/dashboard')}>
                <CheckCircle2 className="h-4 w-4" />
                {t('gettingStarted.finish')}
              </Button>
            ) : (
              <Button type="button" className="gap-2" onClick={goNext}>
                {t('gettingStarted.next')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

// §9.61: useSearchParams 需在 Suspense 内消费，避免静态预渲染报错
export default function GettingStartedPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}>
      <GettingStartedContent />
    </Suspense>
  )
}
