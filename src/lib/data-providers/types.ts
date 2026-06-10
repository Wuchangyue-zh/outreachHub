/**
 * M1a: 数据 Provider 统一类型定义
 * 所有数据源（RocketReach / Apollo / Hunter）共享的输入/输出结构
 */

/** 搜索联系人输入 */
export interface SearchPeopleInput {
  keywords?: string[]
  title?: string[]
  company?: string[]
  location?: string[]
  industry?: string[]
  seniority?: string[]
  page?: number
  perPage?: number
}

/** 搜索公司输入 */
export interface SearchCompanyInput {
  keywords?: string[]
  domain?: string[]
  industry?: string[]
  location?: string[]
  size?: string[]
  page?: number
  perPage?: number
}

/** 统一的联系人搜索结果 */
export interface EnrichedContact {
  source: DataProviderName
  sourceId?: string
  firstName?: string
  lastName?: string
  fullName: string
  title?: string
  company?: string
  companyDomain?: string
  emails: string[]
  phones?: string[]
  linkedinUrl?: string
  country?: string
  city?: string
  seniority?: string
  industry?: string
  raw?: Record<string, unknown>
}

/** 统一的公司搜索结果 */
export interface EnrichedCompany {
  source: DataProviderName
  sourceId?: string
  name: string
  domain?: string
  website?: string
  industry?: string
  size?: string
  country?: string
  city?: string
  description?: string
  linkedinUrl?: string
  raw?: Record<string, unknown>
}

/** 邮箱验证结果 */
export interface EmailVerificationResult {
  email: string
  status: 'valid' | 'invalid' | 'catch-all' | 'unknown' | 'disposable'
  score?: number
  reason?: string
  provider: string
}

/** 域名邮箱搜索结果 */
export interface DomainEmailResult {
  email: string
  firstName?: string
  lastName?: string
  position?: string
  confidence?: number
  source: string
}

export type DataProviderName = 'rocketreach' | 'apollo' | 'hunter' | 'millionverifier'

/** 数据 Provider 接口 */
export interface DataProvider {
  name: DataProviderName
  isConfigured(): boolean
  searchPeople?(input: SearchPeopleInput): Promise<EnrichedContact[]>
  searchCompanies?(input: SearchCompanyInput): Promise<EnrichedCompany[]>
  enrichByEmail?(email: string): Promise<EnrichedContact | null>
  verifyEmail?(email: string): Promise<EmailVerificationResult>
  searchDomain?(domain: string): Promise<DomainEmailResult[]>
}
