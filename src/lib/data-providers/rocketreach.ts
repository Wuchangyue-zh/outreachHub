/**
 * M1b: RocketReach Provider — 适配现有 rocketreach.ts 到统一 DataProvider 接口
 */
import type { DataProvider, SearchPeopleInput, SearchCompanyInput, EnrichedContact, EnrichedCompany } from './types'
import { searchPeople, searchCompanies } from '../rocketreach'

export class RocketReachProvider implements DataProvider {
  name = 'rocketreach' as const

  isConfigured(): boolean {
    return !!process.env.ROCKETREACH_API_KEY
  }

  async searchPeople(input: SearchPeopleInput): Promise<EnrichedContact[]> {
    const results = await searchPeople({
      name: input.keywords?.join(' '),
      title: input.title?.join(' '),
      location: input.location?.join(' '),
      page: input.page,
      limit: input.perPage || 25,
    })

    return results.map((p) => ({
      source: 'rocketreach' as const,
      sourceId: p._id,
      firstName: p.name?.split(' ')[0],
      lastName: p.name?.split(' ').slice(1).join(' '),
      fullName: p.name || '',
      title: p.current_title,
      company: p.current_employer,
      emails: (p.emails?.map((e) => e.address) || p.teaser?.emails || []).filter(Boolean),
      phones: p.phones || p.teaser?.phones || [],
      linkedinUrl: p.linkedin_url,
      country: p.country_code,
      city: p.city,
      raw: p as unknown as Record<string, unknown>,
    }))
  }

  async searchCompanies(input: SearchCompanyInput): Promise<EnrichedCompany[]> {
    const results = await searchCompanies({
      name: input.keywords?.join(' '),
      domain: input.domain?.join(' '),
      industry: input.industry?.join(' '),
      location: input.location?.join(' '),
      page: input.page,
      limit: 25,
    })

    return results.map((c) => ({
      source: 'rocketreach' as const,
      sourceId: String(c._id),
      name: c.name,
      domain: c.email_domain,
      website: c.website,
      industry: c.industry_str,
      size: c.size || (c.employee_count ? String(c.employee_count) : undefined),
      country: c.country_code,
      city: c.city,
      raw: c as unknown as Record<string, unknown>,
    }))
  }
}
