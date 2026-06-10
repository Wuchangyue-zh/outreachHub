'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AvatarUpload } from '@/components/AvatarUpload'
import { Mail, Plus, Trash2, Check, X } from 'lucide-react'

interface EmailAccount {
  id: string
  email: string
  displayName: string
  isActive: boolean
  dailySent: number
  dailyLimit: number
  healthScore: number
}

export default function SettingsPage() {
  const { t } = useI18n()
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    email: '',
    displayName: '',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
  })

  const addAccount = () => {
    if (!form.email || !form.smtpPassword) return
    setAccounts([
      ...accounts,
      {
        id: Math.random().toString(36).slice(2),
        email: form.email,
        displayName: form.displayName || form.email.split('@')[0],
        isActive: true,
        dailySent: 0,
        dailyLimit: 50,
        healthScore: 100,
      },
    ])
    setShowForm(false)
    setForm({ email: '', displayName: '', smtpHost: '', smtpPort: '587', smtpUser: '', smtpPassword: '' })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Profile section */}
        <Card className="border-gray-100">
          <CardHeader>
            <CardTitle className="text-base">{t('settings.profile')}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <AvatarUpload size="lg" onUpload={(url) => console.log('Avatar uploaded:', url)} />
            <div className="flex-1 space-y-4">
              <div>
                <Label>{t('settings.displayName')}</Label>
                <Input placeholder="Your Name" />
              </div>
              <div>
                <Label>{t('settings.email')}</Label>
                <Input value="admin@outreachhub.com" disabled />
              </div>
              <Button>{t('common.save')}</Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
            <p className="text-sm text-gray-500">{t('settings.subtitle')}</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> {t('settings.addEmail')}
          </Button>
        </div>

        {/* Add email form */}
        {showForm && (
          <Card className="border-gray-100">
            <CardHeader>
              <CardTitle className="text-base">{t('settings.addEmailAccount')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('settings.emailAddress')}</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <Label>{t('settings.displayName')}</Label>
                  <Input
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    placeholder={t('settings.senderNamePlaceholder')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>{t('settings.smtpHost')}</Label>
                  <Input
                    value={form.smtpHost}
                    onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <Label>{t('settings.smtpPort')}</Label>
                  <Input
                    value={form.smtpPort}
                    onChange={(e) => setForm({ ...form, smtpPort: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('settings.smtpUser')}</Label>
                  <Input
                    value={form.smtpUser}
                    onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>{t('settings.smtpPassword')}</Label>
                <Input
                  type="password"
                  value={form.smtpPassword}
                  onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })}
                  placeholder={t('settings.smtpPasswordPlaceholder')}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
                <Button onClick={addAccount}>{t('common.save')}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email accounts list */}
        {accounts.length === 0 ? (
          <Card className="border-gray-100">
            <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Mail className="mb-4 h-16 w-16 text-gray-300" />
              <p className="text-lg font-medium">{t('settings.noEmailAccounts')}</p>
              <p className="text-sm">{t('settings.noEmailAccountsHint')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <Card key={account.id} className="border-gray-100">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{account.email}</p>
                      <p className="text-xs text-gray-500">
                        {t('settings.dailyUsage').replace('{sent}', String(account.dailySent)).replace('{limit}', String(account.dailyLimit)).replace('{health}', String(account.healthScore))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${account.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {account.isActive ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {account.isActive ? t('common.enabled') : t('common.disabled')}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tips */}
        <Card className="border-gray-100 bg-amber-50">
          <CardContent className="p-4">
            <h3 className="font-medium text-amber-800">{t('settings.tips.title')}</h3>
            <ul className="mt-2 space-y-1 text-sm text-amber-700">
              <li>• {t('settings.tips.tip1')}</li>
              <li>• {t('settings.tips.tip2')}</li>
              <li>• {t('settings.tips.tip3')}</li>
              <li>• {t('settings.tips.tip4')}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
