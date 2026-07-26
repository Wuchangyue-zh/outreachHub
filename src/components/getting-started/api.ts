import { ImportedContact, ProspectCandidate } from './types'

export function apiErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback
  const d = data as { error?: string | { message?: string }; message?: string }
  if (typeof d.error === 'string') return d.error
  if (d.error && typeof d.error === 'object' && d.error.message) return d.error.message
  if (typeof d.message === 'string') return d.message
  return fallback
}

export async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(url, init)
  let data: T
  try {
    data = await res.json()
  } catch {
    data = {} as T
  }
  return { ok: res.ok, status: res.status, data }
}

/** Escape text for safe HTML email bodies */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function plainTextToEmailHtml(content: string): string {
  return `<p>${escapeHtml(content).replace(/\n/g, '<br/>')}</p>`
}

export async function syncCampaignContacts(
  campaignId: string,
  contactIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const patch = await fetchJson<{ success?: boolean }>(`/api/campaigns/${campaignId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactIds }),
  })
  if (!patch.ok || !patch.data.success) {
    return { success: false, error: apiErrorMessage(patch.data, '同步联系人失败，请重试') }
  }
  return { success: true }
}

export async function createDraftCampaignWithContacts(input: {
  name: string
  subject: string
  content: string
  emailAccountId: string
  contactIds: string[]
  fromEmail?: string
  fromName?: string
  /** If set, skip POST and only PATCH contacts (retry after partial failure) */
  existingCampaignId?: string | null
}): Promise<{ success: boolean; campaignId?: string; error?: string; needsContactSync?: boolean }> {
  const htmlContent = plainTextToEmailHtml(input.content)

  let campaignId = input.existingCampaignId || undefined

  if (!campaignId) {
    const create = await fetchJson<{ success: boolean; data?: { id: string }; error?: unknown }>(
      '/api/campaigns',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name,
          subject: input.subject,
          content: input.content,
          htmlContent,
          emailAccountId: input.emailAccountId,
          contactIds: input.contactIds,
          type: 'SINGLE',
          status: 'DRAFT',
          scheduleType: 'IMMEDIATE',
          fromEmail: input.fromEmail,
          fromName: input.fromName,
        }),
      }
    )

    if (!create.ok || !create.data.success || !create.data.data?.id) {
      return { success: false, error: apiErrorMessage(create.data, '创建活动失败') }
    }
    campaignId = create.data.data.id
  }

  const sync = await syncCampaignContacts(campaignId, input.contactIds)
  if (!sync.success) {
    return {
      success: false,
      campaignId,
      needsContactSync: true,
      error: sync.error || '活动已创建，但同步联系人失败，请重试',
    }
  }

  return { success: true, campaignId }
}

type SearchContactLike = {
  emails?: string[]
  email?: string
  fullName?: string
  firstName?: string
  lastName?: string
  title?: string
  company?: string
  country?: string
  location?: string
  source?: string
  sourceId?: string
}

export function candidatesFromSearch(raw: SearchContactLike[]): ProspectCandidate[] {
  return (raw || [])
    .map((c, i) => {
      const email = Array.isArray(c.emails) ? c.emails[0] : c.email
      if (!email) return null
      const fullName =
        c.fullName ||
        `${c.firstName || ''} ${c.lastName || ''}`.trim() ||
        email
      return {
        key: `${c.source || 'src'}-${c.sourceId || email}-${i}`,
        fullName,
        firstName: c.firstName,
        lastName: c.lastName,
        title: c.title,
        company: c.company,
        email: String(email).trim(),
        country: c.country || c.location,
        source: c.source,
        selected: true,
      } as ProspectCandidate
    })
    .filter(Boolean) as ProspectCandidate[]
}

export function importedFromProspectResults(
  results: Array<{
    success: boolean
    id?: string
    email?: string
    name?: string
    alreadyExists?: boolean
  }>
): ImportedContact[] {
  return results
    .filter((r) => r.success && r.id)
    .map((r) => ({
      id: r.id!,
      email: r.email || '',
      name: r.name || r.email || '',
    }))
}
