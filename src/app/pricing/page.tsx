'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/hooks/use-i18n'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PlanFeature {
  nameKey: string
  price: string
  periodKey: string
  descKey: string
  plan: string | null
  featureKeys: string[]
  ctaKey: string
  href: string | null
  popular: boolean
}

const plans: PlanFeature[] = [
  {
    nameKey: 'pricing.plan.free.name',
    price: '0',
    periodKey: 'pricing.plan.free.period',
    descKey: 'pricing.plan.free.desc',
    plan: null,
    featureKeys: ['pricing.plan.free.features.0', 'pricing.plan.free.features.1', 'pricing.plan.free.features.2', 'pricing.plan.free.features.3', 'pricing.plan.free.features.4'],
    ctaKey: 'pricing.plan.free.cta',
    href: '/register',
    popular: false,
  },
  {
    nameKey: 'pricing.plan.pro.name',
    price: '599',
    periodKey: 'pricing.plan.pro.period',
    descKey: 'pricing.plan.pro.desc',
    plan: 'PRO',
    featureKeys: ['pricing.plan.pro.features.0', 'pricing.plan.pro.features.1', 'pricing.plan.pro.features.2', 'pricing.plan.pro.features.3', 'pricing.plan.pro.features.4', 'pricing.plan.pro.features.5', 'pricing.plan.pro.features.6'],
    ctaKey: 'pricing.plan.pro.cta',
    href: null,
    popular: true,
  },
  {
    nameKey: 'pricing.plan.enterprise.name',
    price: '联系销售',
    periodKey: '',
    descKey: 'pricing.plan.enterprise.desc',
    plan: 'ENTERPRISE',
    featureKeys: ['pricing.plan.enterprise.features.0', 'pricing.plan.enterprise.features.1', 'pricing.plan.enterprise.features.2', 'pricing.plan.enterprise.features.3', 'pricing.plan.enterprise.features.4', 'pricing.plan.enterprise.features.5', 'pricing.plan.enterprise.features.6'],
    ctaKey: 'pricing.plan.enterprise.cta',
    href: 'mailto:sales@outreachhub.com',
    popular: false,
  },
]

export default function PricingPage() {
  const { t } = useI18n()
  const [loading, setLoading] = useState<string | null>(null)

  const handleCheckout = async (plan: string) => {
    setLoading(plan)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (res.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent('/pricing')}`
        return
      }
      const data = await res.json()
      if (data.success && data.data?.url) {
        window.location.href = data.data.url
      } else {
        toast.error(data.error?.message || t('pricing.checkoutFailed'))
      }
    } catch {
      toast.error(t('pricing.serviceUnavailable'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t('pricing.title')}
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          {t('pricing.subtitle')}
        </p>
      </div>

      {/* Plans */}
      <div className="container mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 pb-20 md:grid-cols-3">
        {plans.map((p) => {
          const name = t(p.nameKey)
          const period = p.periodKey ? t(p.periodKey) : ''
          const desc = t(p.descKey)
          const cta = t(p.ctaKey)
          return (
            <Card
              key={p.nameKey}
              className={`relative flex flex-col ${
                p.popular
                  ? 'border-primary shadow-lg ring-2 ring-primary'
                  : ''
              }`}
            >
              {p.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  {t('pricing.popular')}
                </Badge>
              )}
              <CardContent className="flex flex-1 flex-col p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {name}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {desc}
                </p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {p.price === '联系销售' ? '' : '¥'}{p.price}
                  </span>
                  {period && (
                    <span className="text-gray-500 dark:text-gray-400">
                      {period}
                    </span>
                  )}
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {p.featureKeys.map((fk) => (
                    <li
                      key={fk}
                      className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                      {t(fk)}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {p.href ? (
                    <Button
                      asChild
                      className="w-full"
                      variant={p.popular ? 'default' : 'outline'}
                    >
                      <Link href={p.href}>{cta}</Link>
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleCheckout(p.plan!)}
                      disabled={loading === p.plan}
                    >
                      {loading === p.plan ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('pricing.processing')}
                        </>
                      ) : (
                        cta
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Back link */}
      <div className="pb-16 text-center">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          {t('pricing.backToHome')}
        </Link>
      </div>
    </div>
  )
}
