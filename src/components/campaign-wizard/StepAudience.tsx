'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useCampaignWizardStore } from '@/store/campaign-wizard-store'
import { ArrowRight, ArrowLeft, Check, Users, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

// Mock contacts — will be replaced by real API later
const MOCK_CONTACTS = [
  { id: 'c1', name: 'Hans Müller', email: 'hans@mueller-auto.de', company: 'Müller Automotive GmbH', country: '🇩🇪 德国' },
  { id: 'c2', name: 'Sarah Johnson', email: 'sarah.j@precisionparts.co.uk', company: 'Precision Parts Ltd', country: '🇬🇧 英国' },
  { id: 'c3', name: 'Yuki Tanaka', email: 'tanaka@tokyo-mfg.jp', company: 'Tokyo Manufacturing Corp', country: '🇯🇵 日本' },
  { id: 'c4', name: 'Carlos Rivera', email: 'carlos@ribera-industrial.mx', company: 'Ribera Industrial SA', country: '🇲🇽 墨西哥' },
  { id: 'c5', name: 'Anna Kowalski', email: 'anna.k@eurotech-solutions.pl', company: 'EuroTech Solutions', country: '🇵🇱 波兰' },
]

export function StepAudience() {
  const {
    audienceTab, setAudienceTab,
    pastedEmails, setPastedEmails,
    selectedContactIds, toggleContact, selectAllContacts, clearContacts,
    nextStep, prevStep,
  } = useCampaignWizardStore()

  const parsedEmails = pastedEmails
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter((e) => e && e.includes('@'))

  const totalAudience = audienceTab === 'paste'
    ? parsedEmails.length
    : selectedContactIds.length

  const canProceed = totalAudience > 0

  const allSelected = selectedContactIds.length === MOCK_CONTACTS.length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">受众导入</h2>
        <p className="mt-1 text-sm text-gray-500">粘贴邮箱或从已有联系人中选择</p>
      </div>

      {/* Tab switcher */}
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
          手动粘贴邮箱
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
          从已有联系人选择
        </button>
      </div>

      {/* Tab content */}
      {audienceTab === 'paste' ? (
        <div className="space-y-3">
          <Label htmlFor="pastedEmails">邮箱地址</Label>
          <Textarea
            id="pastedEmails"
            rows={8}
            placeholder={'hans@mueller-auto.de\nsarah.j@precisionparts.co.uk\ntanaka@tokyo-mfg.jp\n\n支持每行一个邮箱，也可用逗号或分号分隔'}
            value={pastedEmails}
            onChange={(e) => setPastedEmails(e.target.value)}
            className="font-mono text-sm"
          />
          {parsedEmails.length > 0 && (
            <p className="text-sm text-green-600">
              ✓ 已识别 {parsedEmails.length} 个有效邮箱
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>选择联系人</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => allSelected ? clearContacts() : selectAllContacts(MOCK_CONTACTS.map((c) => c.id))}
              >
                {allSelected ? '取消全选' : '全选'}
              </Button>
            </div>
          </div>

          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
            {MOCK_CONTACTS.map((contact) => {
              const isSelected = selectedContactIds.includes(contact.id)
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => toggleContact(contact.id)}
                  className={cn(
                    'flex w-full items-center gap-4 px-5 py-3.5 text-left transition-all duration-200',
                    isSelected ? 'bg-blue-50' : 'hover:bg-gray-50',
                  )}
                >
                  {/* Checkbox */}
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white',
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{contact.name}</p>
                    <p className="text-xs text-gray-500">{contact.email}</p>
                  </div>

                  {/* Company + Country */}
                  <div className="hidden text-right sm:block">
                    <p className="text-sm text-gray-700">{contact.company}</p>
                    <p className="text-xs text-gray-400">{contact.country}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {selectedContactIds.length > 0 && (
            <p className="text-sm text-blue-600">
              已选择 {selectedContactIds.length} 位联系人
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button type="button" variant="outline" onClick={prevStep} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          上一步
        </Button>
        <div className="flex items-center gap-4">
          {totalAudience > 0 && (
            <span className="text-sm text-gray-500">
              共 {totalAudience} 位收件人
            </span>
          )}
          <Button type="button" onClick={nextStep} disabled={!canProceed} className="gap-2">
            下一步：AI 写信
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
