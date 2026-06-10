'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { useI18n } from '@/hooks/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  BarChart3,
  Download,
  Loader2,
  Users,
  Mail,
  MousePointerClick,
  Reply,
  AlertTriangle,
  TrendingUp,
  ArrowUpDown,
  FileText,
  PieChart as PieChartIcon,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamMember {
  id: string
  name: string | null
  email: string
  avatar: string | null
  dealsWon: number
  dealsWonAmount: number
  totalDeals: number
  contactsClaimed: number
}

interface TeamData {
  users: TeamMember[]
  period: number
}

interface CampaignOverall {
  totalSent: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  totalBounced: number
  openRate: number
  clickRate: number
  replyRate: number
  bounceRate: number
}

interface DailyStat {
  date: string
  sent: number
  opened: number
  clicked: number
  replied: number
}

interface CampaignComparison {
  name: string
  openRate: number
  clickRate: number
  replyRate: number
}

interface GeoStat {
  country: string
  countryZh: string
  count: number
}

interface CampaignStatsData {
  overall: CampaignOverall
  daily: DailyStat[]
  comparison: CampaignComparison[]
  geo: GeoStat[]
}

type SortField = 'dealsWon' | 'dealsWonAmount' | 'totalDeals' | 'contactsClaimed'
type SortDir = 'asc' | 'desc'

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  if (amount >= 10000) {
    return `$${(amount / 10000).toFixed(1)}万`
  }
  return `$${amount.toLocaleString()}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const { t } = useI18n()
  // Period state
  const [period, setPeriod] = useState(30)

  // Loading / error
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Data
  const [teamData, setTeamData] = useState<TeamData | null>(null)
  const [campaignStats, setCampaignStats] = useState<CampaignStatsData | null>(null)

  // Team table sorting
  const [sortField, setSortField] = useState<SortField>('dealsWon')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async (p: number) => {
    setLoading(true)
    setError('')
    try {
      const [teamRes, campaignRes] = await Promise.all([
        fetch(`/api/stats/team?period=${p}`),
        fetch('/api/campaigns/stats'),
      ])

      const teamJson = await teamRes.json()
      const campaignJson = await campaignRes.json()

      if (!teamJson.success) {
        setError(teamJson.error?.message || t('reports.fetchTeamFailed'))
      } else {
        setTeamData(teamJson.data as TeamData)
      }

      if (campaignJson.success) {
        setCampaignStats(campaignJson.data as CampaignStatsData)
      }
    } catch {
      setError(t('reports.fetchDataFailed'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(period)
  }, [period, fetchData])

  // -----------------------------------------------------------------------
  // Sorting
  // -----------------------------------------------------------------------

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sortedUsers = teamData
    ? [...teamData.users].sort((a, b) => {
        const mult = sortDir === 'asc' ? 1 : -1
        return (a[sortField] - b[sortField]) * mult
      })
    : []

  // -----------------------------------------------------------------------
  // CSV Export
  // -----------------------------------------------------------------------

  function handleExportCsv() {
    const lines: string[] = []

    // Team section
    lines.push(`=== ${t('reports.teamPerformance')} ===`)
    lines.push(`${t('reports.member')},邮箱,${t('reports.dealsWon')},${t('reports.dealsWonAmount')},${t('reports.totalDeals')},${t('reports.claimedContacts')}`)
    if (teamData) {
      for (const u of teamData.users) {
        lines.push(
          [
            u.name || '-',
            u.email,
            u.dealsWon,
            u.dealsWonAmount,
            u.totalDeals,
            u.contactsClaimed,
          ].join(',')
        )
      }
    }

    lines.push('')

    // Campaign section
    lines.push(`=== ${t('reports.totalSent')}${t('reports.openRate')} ===`)
    lines.push(`指标,数值`)
    if (campaignStats) {
      const o = campaignStats.overall
      lines.push(`${t('reports.totalSent')},${o.totalSent}`)
      lines.push(`${t('reports.chartOpened')},${o.totalOpened}`)
      lines.push(`${t('reports.chartClicked')},${o.totalClicked}`)
      lines.push(`${t('reports.chartReplied')},${o.totalReplied}`)
      lines.push(`${t('reports.bounceRate')},${o.totalBounced}`)
      lines.push(`${t('reports.openRate')},${o.openRate.toFixed(2)}%`)
      lines.push(`${t('reports.clickRate')},${o.clickRate.toFixed(2)}%`)
      lines.push(`${t('reports.replyRate')},${o.replyRate.toFixed(2)}%`)
      lines.push(`${t('reports.bounceRate')},${o.bounceRate.toFixed(2)}%`)
    }

    lines.push('')

    // Daily trend
    lines.push(`=== ${t('reports.dailyTrend')} ===`)
    lines.push(`日期,${t('reports.chartSent')},${t('reports.chartOpened')},${t('reports.chartClicked')},${t('reports.chartReplied')}`)
    if (campaignStats) {
      for (const d of campaignStats.daily) {
        lines.push(`${d.date},${d.sent},${d.opened},${d.clicked},${d.replied}`)
      }
    }

    lines.push('')

    // Campaign comparison
    lines.push(`=== ${t('reports.campaignComparison')} ===`)
    lines.push(`名称,${t('reports.openRate')},${t('reports.clickRate')},${t('reports.replyRate')}`)
    if (campaignStats) {
      for (const c of campaignStats.comparison) {
        lines.push(
          `"${c.name}",${c.openRate.toFixed(2)}%,${c.clickRate.toFixed(2)}%,${c.replyRate.toFixed(2)}%`
        )
      }
    }

    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = t('reports.csvFileName').replace('{period}', String(period)).replace('{date}', new Date().toISOString().split('T')[0])
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success(t('reports.csvDownloaded'))
  }

  // -----------------------------------------------------------------------
  // Derived chart data — geo → pie
  // -----------------------------------------------------------------------

  const geoPieData = campaignStats?.geo?.slice(0, 6).map((g) => ({
    name: g.countryZh || g.country,
    value: g.count,
  })) ?? []

  // -----------------------------------------------------------------------
  // Sort indicator
  // -----------------------------------------------------------------------

  function SortIndicator({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 text-gray-300 inline" />
    return (
      <ArrowUpDown
        className={cn(
          'ml-1 h-3 w-3 inline',
          sortDir === 'desc' ? 'text-primary' : 'text-primary rotate-180'
        )}
      />
    )
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ================================================================ */}
        {/* Header                                                          */}
        {/* ================================================================ */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
            <p className="text-sm text-gray-500">{t('reports.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Period selector */}
            <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
              {([7, 30, 90] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setPeriod(d)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    period === d
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {t('reports.days').replace('{d}', String(d))}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExportCsv}>
              <Download className="h-4 w-4" />
              {t('reports.exportCsv')}
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* ============================================================ */}
            {/* Section 1: Team Performance                                  */}
            {/* ============================================================ */}
            <Card className="border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  {t('reports.teamPerformance')}
                  <Badge className="ml-auto font-normal border border-gray-300">
                    {t('reports.recentDays').replace('{period}', String(period))}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!teamData || teamData.users.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Users className="h-10 w-10 mb-3 text-gray-300" />
                    <p className="text-sm">{t('reports.noTeamData')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-gray-500 border-b">
                        <tr>
                          <th className="pb-3 font-medium">{t('reports.member')}</th>
                          <th
                            className="pb-3 font-medium cursor-pointer select-none hover:text-gray-700"
                            onClick={() => handleSort('dealsWon')}
                          >
                            {t('reports.dealsWon')} <SortIndicator field="dealsWon" />
                          </th>
                          <th
                            className="pb-3 font-medium cursor-pointer select-none hover:text-gray-700"
                            onClick={() => handleSort('dealsWonAmount')}
                          >
                            {t('reports.dealsWonAmount')} <SortIndicator field="dealsWonAmount" />
                          </th>
                          <th
                            className="pb-3 font-medium cursor-pointer select-none hover:text-gray-700"
                            onClick={() => handleSort('totalDeals')}
                          >
                            {t('reports.totalDeals')} <SortIndicator field="totalDeals" />
                          </th>
                          <th
                            className="pb-3 font-medium cursor-pointer select-none hover:text-gray-700"
                            onClick={() => handleSort('contactsClaimed')}
                          >
                            {t('reports.claimedContacts')} <SortIndicator field="contactsClaimed" />
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {sortedUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                                  {(user.name || user.email)[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{user.name || '-'}</p>
                                  <p className="text-xs text-gray-400">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 font-medium text-gray-900">{user.dealsWon}</td>
                            <td className="py-3 font-medium text-gray-900">
                              {formatCurrency(user.dealsWonAmount)}
                            </td>
                            <td className="py-3 text-gray-700">{user.totalDeals}</td>
                            <td className="py-3 text-gray-700">{user.contactsClaimed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ============================================================ */}
            {/* Section 2: Campaign Performance                              */}
            {/* ============================================================ */}
            {campaignStats && (
              <>
                {/* Overall metric cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <MetricCard
                    icon={Mail}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                    label={t('reports.totalSent')}
                    value={campaignStats.overall.totalSent.toLocaleString()}
                  />
                  <MetricCard
                    icon={FileText}
                    iconBg="bg-green-50"
                    iconColor="text-green-600"
                    label={t('reports.openRate')}
                    value={`${campaignStats.overall.openRate.toFixed(1)}%`}
                  />
                  <MetricCard
                    icon={MousePointerClick}
                    iconBg="bg-orange-50"
                    iconColor="text-orange-600"
                    label={t('reports.clickRate')}
                    value={`${campaignStats.overall.clickRate.toFixed(1)}%`}
                  />
                  <MetricCard
                    icon={Reply}
                    iconBg="bg-purple-50"
                    iconColor="text-purple-600"
                    label={t('reports.replyRate')}
                    value={`${campaignStats.overall.replyRate.toFixed(1)}%`}
                  />
                  <MetricCard
                    icon={AlertTriangle}
                    iconBg="bg-red-50"
                    iconColor="text-red-600"
                    label={t('reports.bounceRate')}
                    value={`${campaignStats.overall.bounceRate.toFixed(1)}%`}
                  />
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Daily trend */}
                  <Card className="border-gray-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        {t('reports.dailyTrend')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {campaignStats.daily.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                          <TrendingUp className="h-10 w-10 mb-3 text-gray-300" />
                          <p className="text-sm">{t('reports.noTrendData')}</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={campaignStats.daily}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                              dataKey="date"
                              tickFormatter={formatDate}
                              tick={{ fontSize: 11 }}
                            />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                              labelFormatter={(v) => t('reports.dateLabel').replace('{v}', String(v))}
                              contentStyle={{ fontSize: 12 }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line
                              type="monotone"
                              dataKey="sent"
                              name={t('reports.chartSent')}
                              stroke={CHART_COLORS[0]}
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="opened"
                              name={t('reports.chartOpened')}
                              stroke={CHART_COLORS[1]}
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="clicked"
                              name={t('reports.chartClicked')}
                              stroke={CHART_COLORS[2]}
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="replied"
                              name={t('reports.chartReplied')}
                              stroke={CHART_COLORS[4]}
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  {/* Campaign comparison */}
                  <Card className="border-gray-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        {t('reports.campaignComparison')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {campaignStats.comparison.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                          <BarChart3 className="h-10 w-10 mb-3 text-gray-300" />
                          <p className="text-sm">{t('reports.noCampaignData')}</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={campaignStats.comparison}
                            layout="vertical"
                            margin={{ left: 80 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                              type="number"
                              tick={{ fontSize: 11 }}
                              tickFormatter={(v) => `${v.toFixed(0)}%`}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              tick={{ fontSize: 11 }}
                              width={80}
                            />
                            <Tooltip
                              formatter={(value: number) => `${value.toFixed(1)}%`}
                              contentStyle={{ fontSize: 12 }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar
                              dataKey="openRate"
                              name={t('reports.chartOpenRate')}
                              fill={CHART_COLORS[0]}
                              radius={[0, 4, 4, 0]}
                            />
                            <Bar
                              dataKey="clickRate"
                              name={t('reports.chartClickRate')}
                              fill={CHART_COLORS[1]}
                              radius={[0, 4, 4, 0]}
                            />
                            <Bar
                              dataKey="replyRate"
                              name={t('reports.chartReplyRate')}
                              fill={CHART_COLORS[2]}
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* ============================================================ */}
            {/* Section 3: Channel / Source Analysis                         */}
            {/* ============================================================ */}
            {campaignStats && campaignStats.geo.length > 0 && (
              <Card className="border-gray-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                    {t('reports.geoDistribution')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Pie chart */}
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={geoPieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            innerRadius={50}
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine
                          >
                            {geoPieData.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => value.toLocaleString()}
                            contentStyle={{ fontSize: 12 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Legend / table */}
                    <div className="flex flex-col justify-center">
                      <div className="space-y-3">
                        {campaignStats.geo.slice(0, 10).map((g, i) => (
                          <div key={g.country} className="flex items-center gap-3">
                            <div
                              className="h-3 w-3 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                              }}
                            />
                            <span className="text-sm text-gray-700 flex-1">
                              {g.countryZh || g.country}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {g.count.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  label: string
  value: string
}

function MetricCard({ icon: Icon, iconBg, iconColor, label, value }: MetricCardProps) {
  return (
    <Card className="border-gray-100">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={cn('rounded-lg p-2', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
