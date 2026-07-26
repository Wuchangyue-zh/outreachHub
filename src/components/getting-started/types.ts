export type WizardStep =
  | 'prereq'
  | 'icp'
  | 'prospect'
  | 'verify'
  | 'campaign'
  | 'launch'

export const WIZARD_STEPS: WizardStep[] = [
  'prereq',
  'icp',
  'prospect',
  'verify',
  'campaign',
  'launch',
]

export type IcpData = {
  industry: string
  country: string
  keywords: string
  hsCode: string
}

export type ProspectCandidate = {
  key: string
  fullName: string
  firstName?: string
  lastName?: string
  title?: string
  company?: string
  email: string
  country?: string
  source?: string
  selected: boolean
}

export type ImportedContact = {
  id: string
  email: string
  name: string
  verifyStatus?: string
}

export type EmailAccountOption = {
  id: string
  email: string
  displayName: string | null
}

export type CampaignDraftForm = {
  name: string
  subject: string
  content: string
}

export type GettingStartedPersisted = {
  step: WizardStep
  icp: IcpData
  importedContacts: ImportedContact[]
  emailAccountId: string
  campaignId: string | null
  campaignForm: CampaignDraftForm
  launched: boolean
}

export const DEFAULT_ICP: IcpData = {
  industry: '',
  country: '',
  keywords: '',
  hsCode: '',
}

export const DEFAULT_CAMPAIGN_FORM: CampaignDraftForm = {
  name: '',
  subject: '',
  content: '',
}

/** Statuses allowed into campaign audience */
export function isSendableVerifyStatus(status?: string): boolean {
  if (!status) return false
  return status === 'valid' || status === 'catch-all' || status === 'unknown'
}

export function storageKey(tenantId: string) {
  return `oh-getting-started:${tenantId}`
}
