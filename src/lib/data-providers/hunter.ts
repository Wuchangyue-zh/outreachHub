/**
 * M2b: Hunter.io Provider — 域名邮箱搜索 + 邮箱验证
 * API 文档：https://hunter.io/api-documentation
 */
import type { DataProvider, DomainEmailResult, EmailVerificationResult } from './types'

const BASE_URL = 'https://api.hunter.io/v2'

export class HunterProvider implements DataProvider {
  name = 'hunter' as const

  isConfigured(): boolean {
    return !!process.env.HUNTER_API_KEY
  }

  /**
   * 域名邮箱搜索：domain → emails[]
   */
  async searchDomain(domain: string): Promise<DomainEmailResult[]> {
    const apiKey = process.env.HUNTER_API_KEY
    if (!apiKey) return []

    try {
      const resp = await fetch(`${BASE_URL}/domain-search?domain=${domain}&api_key=${apiKey}&limit=20`)
      if (!resp.ok) return []

      const data = await resp.json()
      const emails = data.data?.emails || []

      return emails.map((e: Record<string, unknown>) => ({
        email: e.value as string,
        firstName: e.first_name as string,
        lastName: e.last_name as string,
        position: e.position as string,
        confidence: e.confidence as number,
        source: 'hunter' as const,
      }))
    } catch (error) {
      console.error('[Hunter] searchDomain error:', error)
      return []
    }
  }

  /**
   * 邮箱验证
   */
  async verifyEmail(email: string): Promise<EmailVerificationResult> {
    const apiKey = process.env.HUNTER_API_KEY
    if (!apiKey) {
      return { email, status: 'unknown', reason: 'Hunter API key not configured', provider: 'hunter' }
    }

    try {
      const resp = await fetch(`${BASE_URL}/email-verifier?email=${email}&api_key=${apiKey}`)
      if (!resp.ok) {
        return { email, status: 'unknown', reason: `API error: ${resp.status}`, provider: 'hunter' }
      }

      const data = await resp.json()
      const result = data.data

      let status: EmailVerificationResult['status'] = 'unknown'
      if (result.result === 'deliverable') status = 'valid'
      else if (result.result === 'undeliverable') status = 'invalid'
      else if (result.result === 'risky') status = 'catch-all'

      return {
        email,
        status,
        score: result.score,
        reason: result.result,
        provider: 'hunter',
      }
    } catch (error) {
      return { email, status: 'unknown', reason: String(error), provider: 'hunter' }
    }
  }
}
