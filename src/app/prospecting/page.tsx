'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Search, Building, Globe, Users, Send, Loader2 } from 'lucide-react'

export default function ProspectingPage() {
  const { t } = useI18n()
  const [searching, setSearching] = useState(false)
  const [formData, setFormData] = useState({
    keywords: '',
    positions: '',
    locations: '',
    industries: '',
    companySizes: '',
  })

  const handleSearch = async () => {
    setSearching(true)
    try {
      const res = await fetch('/api/prospecting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'create-prospecting-task',
          taskData: {
            name: `${t('prospecting.taskPrefix')} - ${new Date().toLocaleDateString()}`,
            keywords: formData.keywords.split(',').map(s => s.trim()).filter(Boolean),
            positions: formData.positions.split(',').map(s => s.trim()).filter(Boolean),
            locations: formData.locations.split(',').map(s => s.trim()).filter(Boolean),
            industries: formData.industries.split(',').map(s => s.trim()).filter(Boolean),
            companySizes: formData.companySizes.split(',').map(s => s.trim()).filter(Boolean),
            status: 'PENDING',
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        alert(t('prospecting.taskCreated'))
      }
    } catch (e) {
      alert(t('prospecting.taskFailed'))
    } finally {
      setSearching(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('prospecting.title')}</h1>
          <p className="text-sm text-gray-500">{t('prospecting.subtitle')}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Search form */}
          <Card className="lg:col-span-2 border-gray-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                {t('prospecting.searchCriteria')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('prospecting.keywords')}</Label>
                <Input
                  placeholder={t('prospecting.keywordsPlaceholder')}
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('prospecting.positions')}</Label>
                <Input
                  placeholder={t('prospecting.positionsPlaceholder')}
                  value={formData.positions}
                  onChange={(e) => setFormData({ ...formData, positions: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('prospecting.locations')}</Label>
                <Input
                  placeholder={t('prospecting.locationsPlaceholder')}
                  value={formData.locations}
                  onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('prospecting.industries')}</Label>
                <Input
                  placeholder={t('prospecting.industriesPlaceholder')}
                  value={formData.industries}
                  onChange={(e) => setFormData({ ...formData, industries: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('prospecting.companySize')}</Label>
                <Input
                  placeholder={t('prospecting.companySizePlaceholder')}
                  value={formData.companySizes}
                  onChange={(e) => setFormData({ ...formData, companySizes: e.target.value })}
                />
              </div>
              <Button onClick={handleSearch} disabled={searching} className="w-full">
                {searching ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('prospecting.creating')}</>
                ) : (
                  <><Search className="mr-2 h-4 w-4" /> {t('prospecting.createTask')}</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Tips */}
          <div className="space-y-6">
            <Card className="border-gray-100">
              <CardHeader>
                <CardTitle className="text-base">{t('prospecting.tips.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <p>💡 {t('prospecting.tips.tip1')}</p>
                <p>💡 {t('prospecting.tips.tip2')}</p>
                <p>💡 {t('prospecting.tips.tip3')}</p>
                <p>💡 {t('prospecting.tips.tip4')}</p>
              </CardContent>
            </Card>

            <Card className="border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900">{t('prospecting.emailSolutions')}</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    {t('prospecting.solutions.api')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" />
                    {t('prospecting.solutions.ai')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {t('prospecting.solutions.scraper')}
                  </li>
                  <li className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    {t('prospecting.solutions.verify')}
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
