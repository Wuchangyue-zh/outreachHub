'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useCampaignWizardStore } from '@/store/campaign-wizard-store'
import { ArrowRight, ArrowLeft, Check, Users, ClipboardList, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/hooks/use-i18n'

interface ContactRecord {
  id: string
  name: string
  email: string
  company: string
  country: string
}

export function StepAudience() {
  const {
    audienceTab, setAudienceTab,
    pastedEmails, setPastedEmails,
    selectedContactIds, toggleContact, selectAllContacts, clearContacts,
    nextStep, prevStep,
  } = useCampaignWizardStore()

  const { t } = useI18n()

  const [contacts, setContacts] = useState<ContactRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (audienceTab !== 'contacts') return
    setLoading(true)
    fetch('/api/contacts?page=1&limit=100')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const rows: ContactRecord[] = (json.data || []).map((c: any) => ({
            id: c.id,
            name: c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown',
            email: c.emails?.find((e: any) => e.isPrimary)?.address || c.emails?.[0]?.address || '',
            company: c.company?.name || '',
            country: c.country || '',
          })).filter((c: ContactRecord) => c.email)
          setContacts(rows)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [audienceTab])

  const parsedEmails = pastedEmails
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter((e) => e && e.includes('@'))

  const totalAudience = audienceTab === 'paste'
    ? parsedEmails.length
    : selectedContactIds.length

  const canProceed = totalAudience > 0
  const allSelected = contacts.length > 0 && selectedContactIds.length === contacts.length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{t('campaignWizard.audience.title')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('campaignWizard.audience.subtitle')}</p>
      </div>

      <div className="flex gap-2 rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setAudienceTab('paste')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300',
            audienceTab === 'paste'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <ClipboardList className="h-4 w-4" />
          {t('campaignWizard.audience.pasteTab')}
        </button>
        <button
          type="button"
          onClick={() => setAudienceTab('contacts')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300',
            audienceTab === 'contacts'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          <Users className="h-4 w-4" />
          {t('campaignWizard.audience.contactsTab')}
        </button>
      </div>

      {audienceTab === 'paste' ? (
        <div className="space-y-3">
          <Label htmlFor="pastedEmails">{t('campaignWizard.audience.emailLabel')}</Label>
          <Textarea
            id="pastedEmails"
            rows={8}
            placeholder={t('campaignWizard.audience.emailPlaceholder')}
            value={pastedEmails}
            onChange={(e) => setPastedEmails(e.target.value)}
          />
          <p className="text-sm text-gray-500">
            {t('campaignWizard.audience.emailsFound')} <span className="font-semibold text-blue-600">{parsedEmails.length}</span> {t('campaignWizard.audience.emailsFoundSuffix')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {t('campaignWizard.audience.selected')} {selectedContactIds.length} / {contacts.length} {t('campaignWizard.audience.selectedSuffix')}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectAllContacts(contacts.map((c) => c.id))}
                disabled={loading || contacts.length === 0}
              >
                {t('campaignWizard.audience.selectAll')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearContacts}>
                {t('campaignWizard.audience.clear')}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('campaignWizard.audience.loading')}
            </div>
          ) : contacts.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">{t('campaignWizard.audience.empty')}</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-2">
              {contacts.map((contact) => {
                const selected = selectedContactIds.includes(contact.id)
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => toggleContact(contact.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all',
                      selected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-transparent bg-gray-50 hover:bg-gray-100',
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                        selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white',
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{contact.name}</p>
                      <p className="truncate text-xs text-gray-500">{contact.email}</p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="truncate text-xs text-gray-500">{contact.company}</p>
                      <p className="text-xs text-gray-400">{contact.country}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-6">
        <Button type="button" variant="outline" onClick={prevStep} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('campaignWizard.prev')}
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{t('campaignWizard.audience.total')} {totalAudience} {t('campaignWizard.audience.totalSuffix')}</span>
          <Button onClick={nextStep} disabled={!canProceed} className="gap-2">
            {t('campaignWizard.audience.next')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
