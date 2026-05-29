'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Send, Plus, TrendingUp, TrendingDown, Eye, Reply, Rocket,
  Search, Pause, Play, Trash2, MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────

type CampaignStatus = 'sending' | 'paused' | 'draft' | 'completed'

interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  audienceSize: number
  deliveryRate: number
  openRate: number
  replyRate: number
  createdAt: string
}

// ─── Mock Data ──────────────────────────────────────────────

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    name: '北美电子行业 CEO 精准开发',
    status: 'sending',
    audienceSize: 2450,
    deliveryRate: 97.2,
    openRate: 32.4,
    replyRate: 6.8,
    createdAt: '2026-05-22',
  },
  {
    id: '2',
    name: '欧洲机械买家追发序列',
    status: 'sending',
    audienceSize: 1820,
    deliveryRate: 96.8,
    openRate: 28.1,
    replyRate: 5.2,
    createdAt: '2026-05-20',
  },
  {
    id: '3',
    name: '东南亚跨境电商卖家触达',
    status: 'paused',
    audienceSize: 3100,
    deliveryRate: 95.5,
    openRate: 22.7,
    replyRate: 3.9,
    createdAt: '2026-05-18',
  },
  {
    id: '4',
    name: '中东建材采购商首轮开发',
    status: 'completed',
    audienceSize: 890,
    deliveryRate: 98.1,
    openRate: 35.6,
    replyRate: 8.4,
    createdAt: '2026-05-10',
  },
  {
    id: '5',
    name: '拉美汽车零部件 A/B 测试',
    status: 'draft',
    audienceSize: 1560,
    deliveryRate: 0,
    openRate: 0,
    replyRate: 0,
    createdAt: '2026-05-25',
  },
]

const MOCK_STATS = {
  totalSent: 12840,
  avgOpenRate: 24.5,
  openRateDelta: +1.2,
  avgReplyRate: 4.8,
  activeCampaigns: 3,
}

// ─── Status config ──────────────────────────────────────────

const STATUS_CONFIG: Record<CampaignStatus, { label: string; dot: string; bg: string; text: string }> = {
  sending:   { label: 'Sending',   dot: 'bg-green-500 animate-pulse', bg: 'bg-green-50',   text: 'text-green-700' },
  paused:    { label: 'Paused',    dot: 'bg-amber-500',              bg: 'bg-amber-50',    text: 'text-amber-700' },
  draft:     { label: 'Draft',     dot: 'bg-blue-500',               bg: 'bg-blue-50',     text: 'text-blue-700' },
  completed: { label: 'Completed', dot: 'bg-gray-400',               bg: 'bg-gray-100',    text: 'text-gray-600' },
}

// ─── Stat Card ──────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  iconBg,
}: {
  icon: React.ElementType
  label: string
  value: string
  delta?: number
  iconBg: string
}) {
  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', iconBg)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {delta !== undefined && (
            <span
              className={cn(
                'flex items-center gap-0.5 text-xs font-semibold',
                delta >= 0 ? 'text-emerald-600' : 'text-red-500',
              )}
            >
              {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {delta >= 0 ? '+' : ''}{delta}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Rate Bar ───────────────────────────────────────────────

function RateBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-sm tabular-nums text-gray-700">{value > 0 ? `${value}%` : '—'}</span>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────

export default function CampaignsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all')

  const filtered = useMemo(() => {
    return MOCK_CAMPAIGNS.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter])

  const toggleStatus = (id: string) => {
    // Mock toggle — in production this would PATCH /api/campaigns/:id
    console.log('Toggle campaign', id)
  }

  const deleteCampaign = (id: string) => {
    // Mock delete — in production this would DELETE /api/campaigns/:id
    console.log('Delete campaign', id)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 py-6">
        {/* ─── Top Stats Grid ─── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Send}
            label="Total Sent"
            value={MOCK_STATS.totalSent.toLocaleString()}
            iconBg="bg-blue-50 text-blue-600"
          />
          <StatCard
            icon={Eye}
            label="Avg Open Rate"
            value={`${MOCK_STATS.avgOpenRate}%`}
            delta={MOCK_STATS.openRateDelta}
            iconBg="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={Reply}
            label="Avg Reply Rate"
            value={`${MOCK_STATS.avgReplyRate}%`}
            iconBg="bg-violet-50 text-violet-600"
          />
          <StatCard
            icon={Rocket}
            label="Active Campaigns"
            value={String(MOCK_STATS.activeCampaigns)}
            iconBg="bg-amber-50 text-amber-600"
          />
        </div>

        {/* ─── Filter & Actions Bar ─── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            {/* Search */}
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="搜索任务名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="sending">Sending</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* New Campaign button */}
          <Link href="/campaigns/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        </div>

        {/* ─── Campaigns Table ─── */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Campaign Name
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Audience
                </th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Delivery
                </th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Open Rate
                </th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Reply Rate
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Created
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((campaign) => {
                const cfg = STATUS_CONFIG[campaign.status]
                return (
                  <tr
                    key={campaign.id}
                    className="transition-colors hover:bg-gray-50/50"
                  >
                    {/* Name + created */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">{campaign.name}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{campaign.createdAt}</p>
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                          cfg.bg, cfg.text,
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                        {cfg.label}
                      </span>
                    </td>

                    {/* Audience */}
                    <td className="px-5 py-4 text-right tabular-nums text-gray-700">
                      {campaign.audienceSize.toLocaleString()}
                    </td>

                    {/* Delivery rate */}
                    <td className="px-5 py-4 text-center">
                      <RateBar value={campaign.deliveryRate} color="bg-blue-500" />
                    </td>

                    {/* Open rate */}
                    <td className="px-5 py-4 text-center">
                      <RateBar value={campaign.openRate} color="bg-emerald-500" />
                    </td>

                    {/* Reply rate */}
                    <td className="px-5 py-4 text-center">
                      <RateBar value={campaign.replyRate} color="bg-violet-500" />
                    </td>

                    {/* Created */}
                    <td className="px-5 py-4 text-right text-xs text-gray-500">
                      {campaign.createdAt}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        {campaign.status === 'sending' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700"
                            onClick={() => toggleStatus(campaign.id)}
                            title="暂停"
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : campaign.status === 'paused' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={() => toggleStatus(campaign.id)}
                            title="启动"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => deleteCampaign(campaign.id)}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <p className="text-gray-500">没有匹配的营销任务</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
