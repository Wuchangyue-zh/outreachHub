'use client'

import { useI18n } from '@/hooks/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, Users, Send, FileText, Plus } from 'lucide-react'
import Link from 'next/link'

export default function QuickActions() {
  const { t } = useI18n()
  const actions = [
    { name: t('dashboard.quickActions.newProspecting'), icon: Search, href: '/prospecting', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
    { name: t('dashboard.quickActions.importContacts'), icon: Users, href: '/contacts', color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
    { name: t('dashboard.quickActions.createCampaign'), icon: Send, href: '/campaigns', color: 'bg-green-50 text-green-600 hover:bg-green-100' },
    { name: t('dashboard.quickActions.newTemplate'), icon: FileText, href: '/templates', color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
  ]
  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardTitle className="text-lg">{t('dashboard.quickActions.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Link key={action.name} href={action.href}>
              <Button
                variant="outline"
                className={`h-20 w-full flex-col gap-2 ${action.color}`}
              >
                <action.icon className="h-5 w-5" />
                <span className="text-xs">{action.name}</span>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
