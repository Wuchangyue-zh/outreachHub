import { useI18n } from '@/hooks/use-i18n'
import DashboardLayout from '@/components/layout/dashboard-layout'
import StatsOverview from '@/components/dashboard/stats-overview'
import RecentCampaigns from '@/components/dashboard/recent-campaigns'
import ActivityChart from '@/components/dashboard/activity-chart'
import QuickActions from '@/components/dashboard/quick-actions'
import { RealtimeStatus } from '@/components/RealtimeStatus'

export default function DashboardPage() {
  const { t } = useI18n()
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('dashboard.welcome')}
            </p>
          </div>
          <RealtimeStatus />
        </div>

        {/* Stats cards */}
        <StatsOverview />

        {/* Charts and recent campaigns */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActivityChart />
          </div>
          <div>
            <QuickActions />
          </div>
        </div>

        <RecentCampaigns />
      </div>
    </DashboardLayout>
  )
}
