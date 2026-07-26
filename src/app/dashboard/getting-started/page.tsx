'use client'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { GettingStartedWizard } from '@/components/getting-started/GettingStartedWizard'

export const dynamic = 'force-dynamic'

export default function GettingStartedPage() {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        }
      >
        <GettingStartedWizard />
      </Suspense>
    </DashboardLayout>
  )
}
