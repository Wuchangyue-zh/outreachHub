'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_CAMPAIGN_FORM,
  DEFAULT_ICP,
  GettingStartedPersisted,
  IcpData,
  ImportedContact,
  ProspectCandidate,
  CampaignDraftForm,
  WizardStep,
  WIZARD_STEPS,
  storageKey,
} from './types'

export function useGettingStartedState(tenantId: string | null) {
  const [hydrated, setHydrated] = useState(false)
  const [step, setStep] = useState<WizardStep>('prereq')
  const [icp, setIcp] = useState<IcpData>(DEFAULT_ICP)
  const [importedContacts, setImportedContacts] = useState<ImportedContact[]>([])
  const [emailAccountId, setEmailAccountId] = useState('')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [campaignForm, setCampaignForm] = useState<CampaignDraftForm>(DEFAULT_CAMPAIGN_FORM)
  const [launched, setLaunched] = useState(false)
  const [candidates, setCandidates] = useState<ProspectCandidate[]>([])
  /** Only persist after this tenant's storage has been loaded */
  const hydratedTenantRef = useRef<string | null>(null)

  // Hydrate from localStorage when tenantId becomes available
  useEffect(() => {
    if (!tenantId) {
      hydratedTenantRef.current = null
      setHydrated(false)
      return
    }

    hydratedTenantRef.current = null
    setHydrated(false)

    try {
      const raw = localStorage.getItem(storageKey(tenantId))
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GettingStartedPersisted>
        if (parsed.step && WIZARD_STEPS.includes(parsed.step)) setStep(parsed.step)
        if (parsed.icp) setIcp({ ...DEFAULT_ICP, ...parsed.icp })
        if (Array.isArray(parsed.importedContacts)) setImportedContacts(parsed.importedContacts)
        if (typeof parsed.emailAccountId === 'string') setEmailAccountId(parsed.emailAccountId)
        if (parsed.campaignId) setCampaignId(parsed.campaignId)
        if (parsed.campaignForm) setCampaignForm({ ...DEFAULT_CAMPAIGN_FORM, ...parsed.campaignForm })
        if (typeof parsed.launched === 'boolean') setLaunched(parsed.launched)
      } else {
        setStep('prereq')
        setIcp(DEFAULT_ICP)
        setImportedContacts([])
        setEmailAccountId('')
        setCampaignId(null)
        setCampaignForm(DEFAULT_CAMPAIGN_FORM)
        setLaunched(false)
      }
    } catch {
      // ignore corrupt storage
    }

    hydratedTenantRef.current = tenantId
    setHydrated(true)
  }, [tenantId])

  // Persist only after hydrate for this tenant completed
  useEffect(() => {
    if (!tenantId || !hydrated) return
    if (hydratedTenantRef.current !== tenantId) return

    const payload: GettingStartedPersisted = {
      step,
      icp,
      importedContacts,
      emailAccountId,
      campaignId,
      campaignForm,
      launched,
    }
    try {
      localStorage.setItem(storageKey(tenantId), JSON.stringify(payload))
    } catch {
      // quota / private mode
    }
  }, [tenantId, hydrated, step, icp, importedContacts, emailAccountId, campaignId, campaignForm, launched])

  const stepIndex = WIZARD_STEPS.indexOf(step)

  const goTo = useCallback((s: WizardStep) => setStep(s), [])
  const goNext = useCallback(() => {
    setStep((s) => {
      const i = WIZARD_STEPS.indexOf(s)
      return WIZARD_STEPS[Math.min(i + 1, WIZARD_STEPS.length - 1)]
    })
  }, [])
  const goPrev = useCallback(() => {
    setStep((s) => {
      const i = WIZARD_STEPS.indexOf(s)
      return WIZARD_STEPS[Math.max(i - 1, 0)]
    })
  }, [])

  const reset = useCallback(() => {
    setStep('prereq')
    setIcp(DEFAULT_ICP)
    setImportedContacts([])
    setEmailAccountId('')
    setCampaignId(null)
    setCampaignForm(DEFAULT_CAMPAIGN_FORM)
    setLaunched(false)
    setCandidates([])
    if (tenantId) {
      try {
        localStorage.removeItem(storageKey(tenantId))
      } catch {
        // ignore
      }
    }
  }, [tenantId])

  const mergeImported = useCallback((items: ImportedContact[]) => {
    setImportedContacts((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]))
      for (const item of items) {
        const prevItem = map.get(item.id)
        map.set(item.id, {
          ...prevItem,
          ...item,
          // Preserve prior verifyStatus unless the new item explicitly sets one
          verifyStatus: item.verifyStatus ?? prevItem?.verifyStatus,
        })
      }
      return Array.from(map.values())
    })
  }, [])

  return {
    hydrated,
    step,
    stepIndex,
    icp,
    setIcp,
    importedContacts,
    setImportedContacts,
    mergeImported,
    emailAccountId,
    setEmailAccountId,
    campaignId,
    setCampaignId,
    campaignForm,
    setCampaignForm,
    launched,
    setLaunched,
    candidates,
    setCandidates,
    goTo,
    goNext,
    goPrev,
    reset,
  }
}
