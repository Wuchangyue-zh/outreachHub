import { useI18n } from '@/hooks/use-i18n'
import DashboardLayout from '@/components/layout/dashboard-layout'
import DashboardContent from '@/components/dashboard/dashboard-content'

export default function DashboardPage() {
  const { t } = useI18n()
  return (
    <DashboardLayout>
<<<<<<< HEAD
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
=======
      <DashboardContent />
>>>>>>> feat/landing-page
    </DashboardLayout>
  )
}
