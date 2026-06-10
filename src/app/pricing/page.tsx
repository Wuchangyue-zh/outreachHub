'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PlanFeature {
  name: string
  price: string
  period: string
  description: string
  plan: string | null
  features: string[]
  cta: string
  href: string | null
  popular: boolean
}

const plans: PlanFeature[] = [
  {
    name: '免费试用',
    price: '0',
    period: '14天',
    description: '体验全功能',
    plan: null,
    features: ['14 天全功能试用', '100 封/天', '1 个邮箱账户', '1,000 联系人', '基础模板库'],
    cta: '免费注册',
    href: '/register',
    popular: false,
  },
  {
    name: '专业版',
    price: '599',
    period: '/月',
    description: '适合成长型团队',
    plan: 'PRO',
    features: ['2,000 封/天', '5 个邮箱账户', '50,000 联系人', 'AI 邮件生成', '海关数据', '销售漏斗', '优先支持'],
    cta: '立即订阅',
    href: null,
    popular: true,
  },
  {
    name: '企业定制版',
    price: '联系销售',
    period: '',
    description: '适合大规模团队',
    plan: 'ENTERPRISE',
    features: ['不限发送量', '不限邮箱账户', '不限联系人', '专属客服', 'SSO 单点登录', 'API 接口', 'SLA 保障'],
    cta: '联系我们',
    href: 'mailto:sales@outreachhub.com',
    popular: false,
  },
]

export default function PricingPage() {
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
        toast.error(data.error?.message || '无法创建订阅会话')
      }
    } catch {
      toast.error('订阅服务暂时不可用')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
          选择适合你的套餐
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          从免费试用开始，随时升级
        </p>
      </div>

      {/* Plans */}
      <div className="container mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 pb-20 md:grid-cols-3">
        {plans.map((p) => (
          <Card
            key={p.name}
            className={`relative flex flex-col ${
              p.popular
                ? 'border-primary shadow-lg ring-2 ring-primary'
                : ''
            }`}
          >
            {p.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                最受欢迎
              </Badge>
            )}
            <CardContent className="flex flex-1 flex-col p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {p.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {p.description}
              </p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  {p.price === '联系销售' ? '' : '¥'}{p.price}
                </span>
                {p.period && (
                  <span className="text-gray-500 dark:text-gray-400">
                    {p.period}
                  </span>
                )}
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                    {f}
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
                    <Link href={p.href}>{p.cta}</Link>
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
                        处理中...
                      </>
                    ) : (
                      p.cta
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Back link */}
      <div className="pb-16 text-center">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          &larr; 返回首页
        </Link>
      </div>
    </div>
  )
}
