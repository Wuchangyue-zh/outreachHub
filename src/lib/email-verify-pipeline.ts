/**
 * M3a: 邮箱验证流水线（多层级验证，目标 98.5% 准确率）
 *
 * 验证层级：
 *   1. 格式校验（正则）
 *   2. 一次性邮箱检测
 *   3. MX 记录校验（域名是否支持邮件）
 *   4. 第三方验证（MillionVerifier / Hunter.io）
 */
import { isValidEmailFormat, isDisposableEmail, hasMxRecord } from './email-guess'
import { HunterProvider } from './data-providers/hunter'

export type VerifyStatus = 'valid' | 'invalid' | 'catch-all' | 'unknown' | 'disposable' | 'format-error' | 'no-mx'

export interface VerifyResult {
  email: string
  status: VerifyStatus
  checks: {
    format: boolean
    disposable: boolean
    mx: boolean
    provider?: string
    providerResult?: string
  }
  score?: number
}

/**
 * 邮箱验证流水线
 * 层层递进，任一层失败即短路返回
 */
export async function verifyEmailPipeline(email: string): Promise<VerifyResult> {
  const normalized = email.toLowerCase().trim()
  const checks: VerifyResult['checks'] = {
    format: false,
    disposable: false,
    mx: false,
  }

  // Layer 1: 格式校验
  if (!isValidEmailFormat(normalized)) {
    return { email: normalized, status: 'format-error', checks }
  }
  checks.format = true

  // Layer 2: 一次性邮箱检测
  if (isDisposableEmail(normalized)) {
    return { email: normalized, status: 'disposable', checks }
  }
  checks.disposable = true

  // Layer 3: MX 记录校验
  const domain = normalized.split('@')[1]
  const hasMx = await hasMxRecord(domain)
  if (!hasMx) {
    return { email: normalized, status: 'no-mx', checks }
  }
  checks.mx = true

  // Layer 4: 第三方验证
  // 优先 MillionVerifier，其次 Hunter.io
  const mvKey = process.env.MILLION_VERIFIER_API_KEY
  if (mvKey) {
    try {
      const resp = await fetch(`https://api.millionverifier.com/api/v3/?api=${mvKey}&email=${normalized}`)
      if (resp.ok) {
        const data = await resp.json()
        checks.provider = 'millionverifier'
        checks.providerResult = data.result

        let status: VerifyStatus = 'unknown'
        if (data.result === 'valid') status = 'valid'
        else if (data.result === 'invalid') status = 'invalid'
        else if (data.result === 'catch_all' || data.result === 'catch-all') status = 'catch-all'
        else if (data.result === 'disposable') status = 'disposable'

        return { email: normalized, status, checks, score: data.qualityscore }
      }
    } catch (err) {
      console.warn('[Verify] MillionVerifier error:', err)
    }
  }

  // Fallback: Hunter.io verification
  const hunter = new HunterProvider()
  if (hunter.isConfigured()) {
    const result = await hunter.verifyEmail(normalized)
    checks.provider = 'hunter'
    checks.providerResult = result.reason
    return { email: normalized, status: result.status, checks, score: result.score }
  }

  // 无第三方 API — 通过 3 层检查视为 valid（MX 存在 + 格式正确 + 非一次性）
  return { email: normalized, status: 'valid', checks }
}

/**
 * 批量验证（并发控制，避免 API 限流）
 */
export async function verifyBatch(
  emails: string[],
  concurrency: number = 5
): Promise<VerifyResult[]> {
  const results: VerifyResult[] = []
  for (let i = 0; i < emails.length; i += concurrency) {
    const batch = emails.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map((e) => verifyEmailPipeline(e)))
    results.push(...batchResults)
  }
  return results
}
