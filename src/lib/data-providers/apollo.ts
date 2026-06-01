/**
 * M1c: Apollo.io Provider — 联系人搜索 + 邮箱 enrichment
 * API 文档：https://apolloio.github.io/apollo-api-docs
 */
import type { DataProvider, SearchPeopleInput, EnrichedContact } from './types'

const BASE_URL = 'https://api.apollo.io/v1'

export class ApolloProvider implements DataProvider {
  name = 'apollo' as const

  isConfigured(): boolean {
    return !!process.env.APOLLO_API_KEY
  }

  async searchPeople(input: SearchPeopleInput): Promise<EnrichedContact[]> {
    const apiKey = process.env.APOLLO_API_KEY
    if (!apiKey) return []

    try {
      const body: Record<string, unknown> = {
        api_key: apiKey,
        page: input.page || 1,
        per_page: input.perPage || 25,
      }

      if (input.title?.length) body.person_titles = input.title
      if (input.keywords?.length) body.q_keywords = input.keywords.join(' ')
      if (input.seniority?.length) body.person_seniorities = input.seniority
      if (input.industry?.length) body.q_organization_industry_tag_ids = input.industry
      if (input.location?.length) body.person_locations = input.location

      const resp = await fetch(`${BASE_URL}/mixed_people/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!resp.ok) {
        console.error(`[Apollo] searchPeople ${resp.status}: ${await resp.text()}`)
        return []
      }

      const data = await resp.json()
      const people = data.people || []

      return people.map((p: Record<string, unknown>) => ({
        source: 'apollo' as const,
        sourceId: p.id as string,
        firstName: p.first_name as string,
        lastName: p.last_name as string,
        fullName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        title: p.title as string,
        company: (p.organization as Record<string, unknown>)?.name as string,
        companyDomain: (p.organization as Record<string, unknown>)?.primary_domain as string,
        emails: p.email ? [p.email as string] : [],
        phones: (p.phone_numbers as Array<Record<string, string>>)?.map((ph) => ph.sanitized_number) || [],
        linkedinUrl: p.linkedin_url as string,
        city: p.city as string,
        country: p.country as string,
        seniority: p.seniority as string,
        raw: p,
      }))
    } catch (error) {
      console.error('[Apollo] searchPeople error:', error)
      return []
    }
  }

  async enrichByEmail(email: string): Promise<EnrichedContact | null> {
    const apiKey = process.env.APOLLO_API_KEY
    if (!apiKey) return null

    try {
      const resp = await fetch(`${BASE_URL}/people/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, email, reveal_personal_emails: false }),
      })

      if (!resp.ok) return null

      const data = await resp.json()
      const p = data.person
      if (!p) return null

      return {
        source: 'apollo' as const,
        sourceId: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        fullName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        title: p.title,
        company: p.organization?.name,
        companyDomain: p.organization?.primary_domain,
        emails: p.email ? [p.email] : [],
        linkedinUrl: p.linkedin_url,
        city: p.city,
        country: p.country,
        raw: p,
      }
    } catch (error) {
      console.error('[Apollo] enrichByEmail error:', error)
      return null
    }
  }
}
