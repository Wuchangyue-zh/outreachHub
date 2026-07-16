'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StatsOverview from '@/components/dashboard/stats-overview'
import RecentCampaigns from '@/components/dashboard/recent-campaigns'
import ActivityChart from '@/components/dashboard/activity-chart'
import QuickActions from '@/components/dashboard/quick-actions'
import TodayTasks from '@/components/dashboard/today-tasks'
import { RealtimeStatus } from '@/components/RealtimeStatus'
import { useI18n } from '@/hooks/use-i18n'
import { Rocket, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardContent() {
  const { t } = useI18n()
  const router = useRouter()
  const [refreshToken, setRefreshToken] = useState(0)
  const lastSseRefresh = useRef(0)
  const [contactCount, setContactCount] = useState<number | null>(null)

  // §9.61: 获取客户数量，为 0 时展示入门向导 CTA
  useEffect(() => {
    fetch('/api/tenant/usage')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.usage) setContactCount(d.data.usage.contactCount)
      })
      .catch(() => {})
  }, [])

  const handleSseRefresh = useCallback(() => {
    const now = Date.now()
    if (now - lastSseRefresh.current < 60_000) return
    lastSseRefresh.current = now
    setRefreshToken((t) => t + 1)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('dashboard.welcome')}
          </p>
        </div>
        <RealtimeStatus onNewData={handleSseRefresh} />
      </div>

      {/* §9.61: 无客户数据时展示入门向导 CTA */}
      {contactCount === 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-lg">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Sparkles className="h-5 w-5" />
                {t('dashboard.gettingStarted.ctaEmptyTitle')}
              </h2>
              <p className="max-w-xl text-sm text-blue-100">{t('dashboard.gettingStarted.ctaEmptyDesc')}</p>
            </div>
            <Button
              className=" shrink-0 gap-2 bg-white text-blue-700 hover:bg-blue-50"
              size="lg"
              onClick={() => router.push('/dashboard/getting-started')}
            >
              <Rocket className="h-4 w-4" />
              {t('dashboard.gettingStarted.ctaButton')}
            </Button>
          </div>
          {/* decoration */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        </div>
      )}

      <StatsOverview refreshToken={refreshToken} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityChart refreshToken={refreshToken} />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TodayTasks />
        <RecentCampaigns />
      </div>
    </div>
  )
}
