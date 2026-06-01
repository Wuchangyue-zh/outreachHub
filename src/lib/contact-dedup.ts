/**
 * M1e: 多源联系人去重
 * 同 email 合并，保留多 source 元数据
 */
import type { EnrichedContact, DataProviderName } from './data-providers/types'

export interface DedupedContact extends EnrichedContact {
  sources: DataProviderName[]
}

/**
 * 按 email 去重联系人列表
 * 同一 email 的多个来源合并为一条记录，sources 数组记录所有来源
 */
export function dedupContacts(contacts: EnrichedContact[]): DedupedContact[] {
  const byEmail = new Map<string, DedupedContact>()

  for (const contact of contacts) {
    const emails = contact.emails.filter(Boolean)
    if (emails.length === 0) {
      // 无邮箱的记录用 fullName + company 做 key
      const key = `__no_email__:${contact.fullName}:${contact.company || ''}`
      if (!byEmail.has(key)) {
        byEmail.set(key, { ...contact, sources: [contact.source] })
      } else {
        const existing = byEmail.get(key)!
        if (!existing.sources.includes(contact.source)) {
          existing.sources.push(contact.source)
        }
        mergeContactFields(existing, contact)
      }
      continue
    }

    for (const email of emails) {
      const normalizedEmail = email.toLowerCase().trim()
      if (byEmail.has(normalizedEmail)) {
        const existing = byEmail.get(normalizedEmail)!
        if (!existing.sources.includes(contact.source)) {
          existing.sources.push(contact.source)
        }
        mergeContactFields(existing, contact)
      } else {
        byEmail.set(normalizedEmail, {
          ...contact,
          emails: [normalizedEmail],
          sources: [contact.source],
        })
      }
    }
  }

  return Array.from(byEmail.values())
}

/** 合并字段（保留已有值，补充缺失值） */
function mergeContactFields(target: DedupedContact, source: EnrichedContact) {
  if (!target.firstName && source.firstName) target.firstName = source.firstName
  if (!target.lastName && source.lastName) target.lastName = source.lastName
  if (!target.title && source.title) target.title = source.title
  if (!target.company && source.company) target.company = source.company
  if (!target.companyDomain && source.companyDomain) target.companyDomain = source.companyDomain
  if (!target.linkedinUrl && source.linkedinUrl) target.linkedinUrl = source.linkedinUrl
  if (!target.country && source.country) target.country = source.country
  if (!target.city && source.city) target.city = source.city
  if (!target.seniority && source.seniority) target.seniority = source.seniority

  // 补充邮箱
  for (const email of source.emails) {
    const normalized = email.toLowerCase().trim()
    if (!target.emails.includes(normalized)) {
      target.emails.push(normalized)
    }
  }

  // 补充电话
  if (source.phones) {
    target.phones = [...new Set([...(target.phones || []), ...source.phones])]
  }
}
