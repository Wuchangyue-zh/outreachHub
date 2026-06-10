'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Mail,
  Thermometer,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Globe,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmailAccountHealth {
  id: string
  email: string
  displayName: string | null
  isActive: boolean
  healthScore: number
  dailySent: number
  dailyLimit: number
  warmupEnabled: boolean
  warmupDay: number
  warmupTarget: number
  imapLastError: string | null
  imapLastErrorAt: string | null
}

interface BounceStats {
  total: number
  bounced: number
  bounceRate: number
}

interface DeliverabilityData {
  accounts: EmailAccountHealth[]
  bounceStats: BounceStats
  overallHealth: number
  warmupAccounts: number
  activeAccounts: number
}

function HealthScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-green-100 text-green-700' :
    score >= 50 ? 'bg-yellow-100 text-yellow-700' :
    'bg-red-100 text-red-700'
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', color)}>
      {score.toFixed(0)}
    </span>
  )
}

function WarmupProgress({ day, target }: { day: number; target: number }) {
  const maxDay = 21
  const progress = Math.min((day / maxDay) * 100, 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">预热进度</span>
        <span className="font-medium text-gray-900">
          {day > maxDay ? '已完成' : `第 ${day}/${maxDay} 天`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-orange-400 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default function DeliverabilityPage() {
  const [data, setData] = useState<DeliverabilityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError('')
    try {
      const [accountsRes, statsRes] = await Promise.all([
        fetch('/api/email-accounts'),
        fetch('/api/stats'),
      ])

      const accountsJson = await accountsRes.json()
      const statsJson = await statsRes.json()

      if (!accountsJson.success) {
        setError(accountsJson.error?.message || '获取邮箱账户失败')
        return
      }

      const accounts = (accountsJson.data || []) as EmailAccountHealth[]
      const totalSent = statsJson.data?.emails_SENT || 0
      const totalBounced = statsJson.data?.emails_BOUNCED || 0
      const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0

      const overallHealth = accounts.length > 0
        ? accounts.reduce((sum, a) => sum + a.healthScore, 0) / accounts.length
        : 0

      setData({
        accounts,
        bounceStats: { total: totalSent, bounced: totalBounced, bounceRate },
        overallHealth,
        warmupAccounts: accounts.filter((a) => a.warmupEnabled && a.warmupDay <= 21).length,
        activeAccounts: accounts.filter((a) => a.isActive).length,
      })
    } catch {
      setError('获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">送达率监控</h1>
            <p className="text-sm text-gray-500">域名健康度、邮箱预热进度、退信率一览</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-1">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            刷新
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : data ? (
          <>
            {/* 概览卡片 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg p-2 bg-blue-50">
                      <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold text-gray-900">{data.overallHealth.toFixed(0)}</p>
                    <p className="text-xs text-gray-500">整体健康度</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg p-2 bg-green-50">
                      <Mail className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold text-gray-900">{data.activeAccounts}</p>
                    <p className="text-xs text-gray-500">活跃发件箱</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg p-2 bg-orange-50">
                      <Thermometer className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold text-gray-900">{data.warmupAccounts}</p>
                    <p className="text-xs text-gray-500">预热中账户</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg p-2 bg-red-50">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold text-gray-900">
                      {data.bounceStats.bounceRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">退信率</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 账户详情表 */}
            <Card className="border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-primary" />
                  发件箱健康详情
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.accounts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Mail className="h-8 w-8 mb-2" />
                    <p className="text-sm">尚未配置发件邮箱</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-gray-500 border-b">
                        <tr>
                          <th className="pb-3 font-medium">邮箱</th>
                          <th className="pb-3 font-medium">状态</th>
                          <th className="pb-3 font-medium">健康度</th>
                          <th className="pb-3 font-medium">今日发送</th>
                          <th className="pb-3 font-medium">预热状态</th>
                          <th className="pb-3 font-medium">最近错误</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.accounts.map((account) => (
                          <tr key={account.id} className="hover:bg-gray-50">
                            <td className="py-3">
                              <div>
                                <p className="font-medium text-gray-900">{account.email}</p>
                                {account.displayName && (
                                  <p className="text-xs text-gray-400">{account.displayName}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-3">
                              {account.isActive ? (
                                <Badge className="bg-green-50 text-green-700 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  活跃
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-50 text-gray-500 border-gray-200">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  停用
                                </Badge>
                              )}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <HealthScoreBadge score={account.healthScore} />
                                <div className="h-1.5 w-16 rounded-full bg-gray-200">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all',
                                      account.healthScore >= 80 ? 'bg-green-500' :
                                      account.healthScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    )}
                                    style={{ width: `${Math.min(account.healthScore, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3">
                              <span className="text-gray-700">
                                {account.dailySent}/{account.dailyLimit}
                              </span>
                              <div className="mt-1 h-1 w-20 rounded-full bg-gray-200">
                                <div
                                  className="h-full rounded-full bg-blue-500 transition-all"
                                  style={{
                                    width: `${Math.min((account.dailySent / account.dailyLimit) * 100, 100)}%`,
                                  }}
                                />
                              </div>
                            </td>
                            <td className="py-3">
                              {account.warmupEnabled ? (
                                account.warmupDay > 21 ? (
                                  <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                                    预热完成
                                  </Badge>
                                ) : (
                                  <div className="w-32">
                                    <WarmupProgress day={account.warmupDay} target={account.warmupTarget} />
                                  </div>
                                )
                              ) : (
                                <span className="text-xs text-gray-400">未启用</span>
                              )}
                            </td>
                            <td className="py-3">
                              {account.imapLastError ? (
                                <div className="max-w-[200px]">
                                  <p className="text-xs text-red-600 truncate" title={account.imapLastError}>
                                    {account.imapLastError}
                                  </p>
                                  {account.imapLastErrorAt && (
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                      {new Date(account.imapLastErrorAt).toLocaleString('zh-CN')}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">无</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 退信统计 */}
            <Card className="border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  送达率统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <p className="text-3xl font-bold text-gray-900">
                      {data.bounceStats.total.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">总发送</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <p className="text-3xl font-bold text-red-600">
                      {data.bounceStats.bounced.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">退信</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 text-center">
                    <p className={cn(
                      'text-3xl font-bold',
                      data.bounceStats.bounceRate <= 2 ? 'text-green-600' :
                      data.bounceStats.bounceRate <= 5 ? 'text-yellow-600' : 'text-red-600'
                    )}>
                      {data.bounceStats.bounceRate.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-500">退信率</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {data.bounceStats.bounceRate <= 2 ? '✓ 优秀' :
                       data.bounceStats.bounceRate <= 5 ? '⚠ 一般' : '✗ 需改善'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
