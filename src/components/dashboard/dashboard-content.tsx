'use client'

import { useState, useRef, useCallback } from 'react'
import StatsOverview from '@/components/dashboard/stats-overview'
import RecentCampaigns from '@/components/dashboard/recent-campaigns'
import ActivityChart from '@/components/dashboard/activity-chart'
import QuickActions from '@/components/dashboard/quick-actions'
import TodayTasks from '@/components/dashboard/today-tasks'
import { RealtimeStatus } from '@/components/RealtimeStatus'
import { useI18n } from '@/hooks/use-i18n'

export default function DashboardContent() {
  const { t } = useI18n()
  const [refreshToken, setRefreshToken] = useState(0)
  const lastSseRefresh = useRef(0)

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
