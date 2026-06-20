import { create } from 'zustand'
import { createStepId, type SequenceStepPayload } from '@/lib/sequence-utils'

// ─── Types ──────────────────────────────────────────────────

export type WizardStep = 1 | 2 | 3

export type ToneType = 'professional' | 'warm' | 'concise' | 'urgent'

export type CampaignType = 'SINGLE' | 'SEQUENCE' | 'AB_TEST'

export interface SenderAccount {
  id: string
  email: string
  name: string
}

export interface ContactRecord {
  id: string
  name: string
  email: string
  company: string
  country: string
}

export type ScheduleType = 'IMMEDIATE' | 'SCHEDULED' | 'RECURRING'
export type RecurrenceRule = 'daily' | 'weekly' | 'monthly'

// #7: 序列步骤定义（支持 email / wait / condition）
export type SequenceStep = SequenceStepPayload

export interface HydratePayload {
  id: string
  name: string
  type: CampaignType
  subject: string
  content: string
  htmlContent?: string | null
  emailAccountId?: string | null
  productId?: string | null
  scheduleType: ScheduleType
  scheduledAt?: string | null
  timezone?: string
  sendingWindows?: { start?: string; end?: string } | null
  recurrenceRule?: string | null
  contactIds?: string[]
  sequence?: any[] | null
  abTestEnabled?: boolean
}

export interface WizardState {
  // Edit mode
  editingCampaignId: string | null
  isHydrating: boolean
  hydrateError: string | null
  hydrateFromCampaign: (campaign: HydratePayload) => void

  // Step tracking
  currentStep: WizardStep
  setStep: (step: WizardStep) => void
  nextStep: () => void
  prevStep: () => void

  // Step 1: Basic Info
  campaignName: string
  setCampaignName: (v: string) => void
  language: string
  setLanguage: (v: string) => void
  targetTags: string
  setTargetTags: (v: string) => void
  senderAccountId: string
  setSenderAccountId: (v: string) => void

  // #52: 产品关联
  productId: string
  setProductId: (v: string) => void

  // #7: 活动类型
  campaignType: CampaignType
  setCampaignType: (v: CampaignType) => void

  // #8: A/B 测试变体
  variantBSubject: string
  setVariantBSubject: (v: string) => void
  variantBContent: string
  setVariantBContent: (v: string) => void

  // #7: 序列步骤
  sequence: SequenceStep[]
  addSequenceStep: () => void
  removeSequenceStep: (idx: number) => void
  updateSequenceStep: (idx: number, patch: Partial<SequenceStep>) => void

  // 发送调度
  scheduleType: ScheduleType
  setScheduleType: (v: ScheduleType) => void
  scheduledAt: string
  setScheduledAt: (v: string) => void
  recurrenceRule: RecurrenceRule
  setRecurrenceRule: (v: RecurrenceRule) => void
  timezone: string
  setTimezone: (v: string) => void
  windowStart: string
  setWindowStart: (v: string) => void
  windowEnd: string
  setWindowEnd: (v: string) => void

  // Step 2: Audience
  audienceTab: 'paste' | 'contacts'
  setAudienceTab: (v: 'paste' | 'contacts') => void
  pastedEmails: string
  setPastedEmails: (v: string) => void
  selectedContactIds: string[]
  toggleContact: (id: string) => void
  selectAllContacts: (ids: string[]) => void
  clearContacts: () => void

  // Step 3: AI Writer
  productPrompt: string
  setProductPrompt: (v: string) => void
  tone: ToneType
  setTone: (v: ToneType) => void
  generatedEmail: string
  setGeneratedEmail: (v: string) => void
  isGenerating: boolean
  setIsGenerating: (v: boolean) => void

  // Reset
  resetWizard: () => void
}

// ─── Store ──────────────────────────────────────────────────

export const useCampaignWizardStore = create<WizardState>((set) => ({
  // Edit mode
  editingCampaignId: null,
  isHydrating: false,
  hydrateError: null,
  hydrateFromCampaign: (campaign) => {
    const sendingWindows = campaign.sendingWindows as { start?: string; end?: string } | null
    const seq = Array.isArray(campaign.sequence) ? campaign.sequence : []

    // Parse A/B test variant B from sequence
    let variantBSubject = ''
    let variantBContent = ''
    if (campaign.abTestEnabled && seq.length >= 2) {
      const variantB = seq.find((s: any) => s.variant === 'B')
      if (variantB) {
        variantBSubject = variantB.subject || ''
        variantBContent = variantB.content || ''
      }
    }

    set({
      editingCampaignId: campaign.id,
      isHydrating: false,
      hydrateError: null,
      campaignName: campaign.name || '',
      campaignType: campaign.type || 'SINGLE',
      senderAccountId: campaign.emailAccountId || '',
      productId: campaign.productId || '',
      scheduleType: campaign.scheduleType || 'IMMEDIATE',
      scheduledAt: campaign.scheduledAt
        ? new Date(campaign.scheduledAt).toISOString().slice(0, 16)
        : '',
      timezone: campaign.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
      windowStart: sendingWindows?.start || '09:00',
      windowEnd: sendingWindows?.end || '17:00',
      recurrenceRule: (campaign.recurrenceRule as RecurrenceRule) || 'weekly',
      selectedContactIds: campaign.contactIds || [],
      generatedEmail: campaign.content || '',
      variantBSubject,
      variantBContent,
      sequence: campaign.type === 'SEQUENCE'
        ? seq.filter((s: any) => s.type !== undefined || s.subject !== undefined).map((s: any, i: number) => ({
            id: s.id || `step-${i + 1}`,
            type: s.type || 'email',
            subject: s.subject || '',
            content: s.content || '',
            htmlContent: s.htmlContent || '',
            delayHours: s.delayHours ?? (i === 0 ? 0 : 24),
            ...(s.conditionType ? { conditionType: s.conditionType, lookbackHours: s.lookbackHours, branches: s.branches } : {}),
          }))
        : [],
      currentStep: 1,
    })
  },

  // Step tracking
  currentStep: 1,
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 3) as WizardStep })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) as WizardStep })),

  // Step 1
  campaignName: '',
  setCampaignName: (v) => set({ campaignName: v }),
  language: 'en',
  setLanguage: (v) => set({ language: v }),
  targetTags: '',
  setTargetTags: (v) => set({ targetTags: v }),
  senderAccountId: '',
  setSenderAccountId: (v) => set({ senderAccountId: v }),

  // #52: 产品关联
  productId: '',
  setProductId: (v) => set({ productId: v }),

  // #7: 活动类型
  campaignType: 'SINGLE',
  setCampaignType: (v) => set({ campaignType: v }),

  // #8: A/B 测试变体
  variantBSubject: '',
  setVariantBSubject: (v) => set({ variantBSubject: v }),
  variantBContent: '',
  setVariantBContent: (v) => set({ variantBContent: v }),

  // #7: 序列步骤
  sequence: [],
  addSequenceStep: () =>
    set((s) => ({
      sequence: [
        ...s.sequence,
        {
          id: createStepId(s.sequence),
          type: 'email',
          subject: '',
          content: '',
          delayHours: s.sequence.length === 0 ? 0 : 24,
        },
      ],
    })),
  removeSequenceStep: (idx) =>
    set((s) => ({ sequence: s.sequence.filter((_, i) => i !== idx) })),
  updateSequenceStep: (idx, patch) =>
    set((s) => ({
      sequence: s.sequence.map((step, i) => (i === idx ? { ...step, ...patch } : step)),
    })),

  scheduleType: 'IMMEDIATE',
  setScheduleType: (v) => set({ scheduleType: v }),
  scheduledAt: '',
  setScheduledAt: (v) => set({ scheduledAt: v }),
  recurrenceRule: 'weekly',
  setRecurrenceRule: (v) => set({ recurrenceRule: v }),
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
  setTimezone: (v) => set({ timezone: v }),
  windowStart: '09:00',
  setWindowStart: (v) => set({ windowStart: v }),
  windowEnd: '17:00',
  setWindowEnd: (v) => set({ windowEnd: v }),

  // Step 2
  audienceTab: 'paste',
  setAudienceTab: (v) => set({ audienceTab: v }),
  pastedEmails: '',
  setPastedEmails: (v) => set({ pastedEmails: v }),
  selectedContactIds: [],
  toggleContact: (id) =>
    set((s) => ({
      selectedContactIds: s.selectedContactIds.includes(id)
        ? s.selectedContactIds.filter((x) => x !== id)
        : [...s.selectedContactIds, id],
    })),
  selectAllContacts: (ids) => set({ selectedContactIds: ids }),
  clearContacts: () => set({ selectedContactIds: [] }),

  // Step 3
  productPrompt: '',
  setProductPrompt: (v) => set({ productPrompt: v }),
  tone: 'professional',
  setTone: (v) => set({ tone: v }),
  generatedEmail: '',
  setGeneratedEmail: (v) => set({ generatedEmail: v }),
  isGenerating: false,
  setIsGenerating: (v) => set({ isGenerating: v }),

  // Reset
  resetWizard: () =>
    set({
      editingCampaignId: null,
      isHydrating: false,
      hydrateError: null,
      currentStep: 1,
      campaignName: '',
      language: 'en',
      targetTags: '',
      senderAccountId: '',
      productId: '',
      campaignType: 'SINGLE',
      variantBSubject: '',
      variantBContent: '',
      sequence: [],
      scheduleType: 'IMMEDIATE',
      scheduledAt: '',
      recurrenceRule: 'weekly',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
      windowStart: '09:00',
      windowEnd: '17:00',
      audienceTab: 'paste',
      pastedEmails: '',
      selectedContactIds: [],
      productPrompt: '',
      tone: 'professional',
      generatedEmail: '',
      isGenerating: false,
    }),
}))
