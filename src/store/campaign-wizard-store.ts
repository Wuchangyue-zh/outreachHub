import { create } from 'zustand'

// ─── Types ──────────────────────────────────────────────────

export type WizardStep = 1 | 2 | 3

export type ToneType = 'professional' | 'warm' | 'concise' | 'urgent'

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

export interface WizardState {
  // Step tracking
  currentStep: WizardStep
  setStep: (step: WizardStep) => void
  nextStep: () => void
  prevStep: () => void

  // Step 1: Basic Info
  campaignName: string
  setCampaignName: (v: string) => void
  targetTags: string
  setTargetTags: (v: string) => void
  senderAccountId: string
  setSenderAccountId: (v: string) => void

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
  // Step tracking
  currentStep: 1,
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 3) as WizardStep })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 1) as WizardStep })),

  // Step 1
  campaignName: '',
  setCampaignName: (v) => set({ campaignName: v }),
  targetTags: '',
  setTargetTags: (v) => set({ targetTags: v }),
  senderAccountId: '',
  setSenderAccountId: (v) => set({ senderAccountId: v }),

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
      currentStep: 1,
      campaignName: '',
      targetTags: '',
      senderAccountId: '',
      audienceTab: 'paste',
      pastedEmails: '',
      selectedContactIds: [],
      productPrompt: '',
      tone: 'professional',
      generatedEmail: '',
      isGenerating: false,
    }),
}))
