/**
 * M1e: 多源联系人去重单元测试
 */
import { dedupContacts } from '@/lib/contact-dedup'
import type { EnrichedContact } from '@/lib/data-providers/types'

describe('contact-dedup', () => {
  it('should dedup contacts with same email', () => {
    const contacts: EnrichedContact[] = [
      { source: 'rocketreach', fullName: 'John Doe', emails: ['john@example.com'], title: 'CEO' },
      { source: 'apollo', fullName: 'John D.', emails: ['john@example.com'], company: 'Acme' },
    ]
    const result = dedupContacts(contacts)
    expect(result).toHaveLength(1)
    expect(result[0].sources).toEqual(['rocketreach', 'apollo'])
    expect(result[0].title).toBe('CEO') // 保留第一个的 title
    expect(result[0].company).toBe('Acme') // 补充第二个的 company
  })

  it('should keep contacts with different emails', () => {
    const contacts: EnrichedContact[] = [
      { source: 'rocketreach', fullName: 'John Doe', emails: ['john@example.com'] },
      { source: 'apollo', fullName: 'Jane Smith', emails: ['jane@example.com'] },
    ]
    const result = dedupContacts(contacts)
    expect(result).toHaveLength(2)
  })

  it('should handle contacts without emails', () => {
    const contacts: EnrichedContact[] = [
      { source: 'rocketreach', fullName: 'John Doe', emails: [], company: 'Acme' },
      { source: 'apollo', fullName: 'John Doe', emails: [], company: 'Acme' },
    ]
    const result = dedupContacts(contacts)
    expect(result).toHaveLength(1)
    expect(result[0].sources).toContain('rocketreach')
    expect(result[0].sources).toContain('apollo')
  })

  it('should keep separate records for different emails from same person', () => {
    const contacts: EnrichedContact[] = [
      { source: 'rocketreach', fullName: 'John', emails: ['john@work.com'] },
      { source: 'apollo', fullName: 'John', emails: ['john@personal.com'] },
    ]
    const result = dedupContacts(contacts)
    // Different emails = different records (dedup is by email, not by name)
    expect(result).toHaveLength(2)
  })

  it('should merge same email from different sources', () => {
    const contacts: EnrichedContact[] = [
      { source: 'rocketreach', fullName: 'John', emails: ['john@work.com'], title: 'CEO' },
      { source: 'apollo', fullName: 'John D.', emails: ['john@work.com'], company: 'Acme' },
    ]
    const result = dedupContacts(contacts)
    expect(result).toHaveLength(1)
    expect(result[0].emails).toContain('john@work.com')
    expect(result[0].sources).toContain('rocketreach')
    expect(result[0].sources).toContain('apollo')
  })

  it('should dedup by email across multiple contacts', () => {
    const contacts: EnrichedContact[] = [
      { source: 'rocketreach', fullName: 'A', emails: ['a@x.com'] },
      { source: 'apollo', fullName: 'B', emails: ['b@x.com'] },
      { source: 'hunter', fullName: 'C', emails: ['a@x.com'] }, // same as A
    ]
    const result = dedupContacts(contacts)
    expect(result).toHaveLength(2) // a@x.com (A+C merged), b@x.com (B separate)
  })
})
