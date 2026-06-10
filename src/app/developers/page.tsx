'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/hooks/use-i18n'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, ExternalLink, Code, Lock, ArrowLeft, BookOpen } from 'lucide-react'
import { useState } from 'react'

const endpoints = [
  { method: 'GET', path: '/api/v1/contacts', description: '获取联系人列表（公开 API v1）', auth: true },
  { method: 'POST', path: '/api/v1/contacts', description: '创建联系人（公开 API v1）', auth: true },
  { method: 'GET', path: '/api/v1/contacts/{id}', description: '获取联系人详情（公开 API v1）', auth: true },
  { method: 'PUT', path: '/api/v1/contacts/{id}', description: '更新联系人（公开 API v1）', auth: true },
  { method: 'DELETE', path: '/api/v1/contacts/{id}', description: '删除联系人（公开 API v1）', auth: true },
  { method: 'GET', path: '/api/contacts', description: '获取联系人列表（内部 API）', auth: true },
  { method: 'POST', path: '/api/contacts', description: '创建联系人', auth: true },
  { method: 'GET', path: '/api/contacts/{id}', description: '获取联系人详情', auth: true },
  { method: 'PUT', path: '/api/contacts/{id}', description: '更新联系人', auth: true },
  { method: 'DELETE', path: '/api/contacts/{id}', description: '删除联系人', auth: true },
  { method: 'GET', path: '/api/campaigns', description: '获取活动列表', auth: true },
  { method: 'POST', path: '/api/campaigns', description: '创建活动', auth: true },
  { method: 'POST', path: '/api/campaigns/{id}/launch', description: '启动活动', auth: true },
  { method: 'GET', path: '/api/deals', description: '获取商机列表', auth: true },
  { method: 'POST', path: '/api/deals', description: '创建商机', auth: true },
  { method: 'GET', path: '/api/deals/stats', description: '漏斗统计', auth: true },
  { method: 'GET', path: '/api/stats', description: '租户统计', auth: true },
  { method: 'GET', path: '/api/stats/team', description: '团队绩效', auth: true },
  { method: 'GET', path: '/api/api-keys', description: '获取 API Key 列表', auth: true },
  { method: 'POST', path: '/api/api-keys', description: '创建 API Key', auth: true },
  { method: 'GET', path: '/api/webhooks', description: '获取 Webhook 端点列表', auth: true },
  { method: 'POST', path: '/api/webhooks', description: '创建 Webhook 端点', auth: true },
  { method: 'POST', path: '/api/webhooks/{id}/test', description: '发送测试 Webhook', auth: true },
  { method: 'POST', path: '/api/demo', description: '提交演示预约', auth: false },
]

const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-orange-100 text-orange-700',
}

export default function DevelopersPage() {
  const { t } = useI18n()
  const [showRedoc, setShowRedoc] = useState(false)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-bold">OutreachHub</Link>
          <Link href="/" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> {t('developers.backToHome')}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('developers.apiDoc')}</h1>
            <p className="mt-2 text-gray-600">{t('developers.apiRef')}</p>
              <p className="mt-1 text-sm text-amber-600">
                {t('developers.apiRequiresPlan').split('专业版及以上套餐').length > 1 ? <>{t('developers.apiRequiresPlan').split('专业版及以上套餐')[0]}<a href="/pricing" className="underline font-medium">专业版及以上套餐</a>{t('developers.apiRequiresPlan').split('专业版及以上套餐')[1]}</> : t('developers.apiRequiresPlan')}
              </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setShowRedoc(!showRedoc)}>
              <BookOpen className="h-4 w-4" /> {showRedoc ? t('developers.close') : t('developers.redocInteractive')}
            </Button>
            <a href="/docs/openapi.yaml" download>
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" /> {t('developers.downloadOpenapi')}
              </Button>
            </a>
          </div>
        </div>

        {/* Redoc embed */}
        {showRedoc && (
          <Card className="mt-6 overflow-hidden">
            <CardContent className="p-0">
              <iframe
                src={`https://cdn.redoc.ly/redoc/embed?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/docs/openapi.yaml' : '/docs/openapi.yaml')}`}
                style={{ width: '100%', height: '80vh', border: 'none' }}
                title="API 文档 (Redoc)"
              />
            </CardContent>
          </Card>
        )}

        {/* Auth */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" /> {t('developers.authMethod')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('developers.jwtBearer')}</h3>
              <p className="text-sm text-gray-600">{t('developers.jwtDesc')}</p>
              <pre className="mt-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900">
                <code>Authorization: Bearer {'<your-jwt-token>'}</code>
              </pre>
              <p className="mt-2 text-sm text-gray-600">
                {t('developers.tokenValidity')}
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('developers.apiKey')}</h3>
              <p className="text-sm text-gray-600">
                {t('developers.apiKeyDesc')}
              </p>
              <p className="text-sm text-gray-600 mt-2">{t('developers.twoWays')}</p>
              <pre className="mt-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900 space-y-1">
                <code>x-api-key: oh_{'<your-api-key>'}</code>
                <br />
                <code>Authorization: Bearer oh_{'<your-api-key>'}</code>
              </pre>
              <p className="mt-2 text-sm text-gray-600">
                {t('developers.apiKeyLocation')}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {t('developers.apiKeyRateLimit')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <h2 className="mt-10 text-xl font-semibold">{t('developers.endpoints')}</h2>
        <div className="mt-4 space-y-2">
          {endpoints.map((ep) => (
            <div key={`${ep.method}-${ep.path}`} className="flex items-center gap-3 rounded-lg border px-4 py-3">
              <Badge className={`${methodColors[ep.method]} font-mono text-xs`}>{ep.method}</Badge>
              <code className="flex-1 text-sm">{ep.path}</code>
              <span className="text-sm text-gray-500">{ep.description}</span>
              {ep.auth && <Lock className="h-3 w-3 text-gray-400" />}
            </div>
          ))}
        </div>

        {/* Rate Limits */}
        <Card className="mt-10">
          <CardHeader>
            <CardTitle className="text-base">{t('developers.rateLimit')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>{t('developers.rateGet')}</p>
            <p>{t('developers.ratePost')}</p>
            <p>{t('developers.rateAuth')}</p>
            <p>{t('developers.rateExceeded')}</p>
          </CardContent>
        </Card>

        {/* SDKs */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{t('developers.sdkIntegration')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>{t('developers.sdkCompat')}</p>
            <p>{t('developers.webhookDesc')}</p>
            <p>{t('developers.webhookManage')}</p>
            <p>{t('developers.enterpriseSupport')}</p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
