/**
 * K1: DNS 记录在线验证
 * 使用 Node.js 内置 dns 模块解析 SPF/DKIM/DMARC 记录
 */
import { promises as dns } from 'dns'

export interface DnsVerificationResult {
  record: string
  host: string
  found: boolean
  value: string | null
  valid: boolean
  message: string
}

/**
 * 验证 SPF 记录
 */
export async function verifySPF(domain: string): Promise<DnsVerificationResult> {
  try {
    const records = await dns.resolveTxt(domain)
    const spfRecord = records
      .map((r) => r.join(''))
      .find((r) => r.startsWith('v=spf1'))

    if (!spfRecord) {
      return { record: 'SPF', host: domain, found: false, value: null, valid: false, message: '未找到 SPF 记录' }
    }

    // 基本格式校验
    const hasAll = spfRecord.includes('all')
    if (!hasAll) {
      return { record: 'SPF', host: domain, found: true, value: spfRecord, valid: false, message: 'SPF 记录缺少 all 机制' }
    }

    return { record: 'SPF', host: domain, found: true, value: spfRecord, valid: true, message: 'SPF 记录有效 ✓' }
  } catch (err: any) {
    return { record: 'SPF', host: domain, found: false, value: null, valid: false, message: `DNS 查询失败: ${err.code || err.message}` }
  }
}

/**
 * 验证 DMARC 记录
 */
export async function verifyDMARC(domain: string): Promise<DnsVerificationResult> {
  const dmarcHost = `_dmarc.${domain}`
  try {
    const records = await dns.resolveTxt(dmarcHost)
    const dmarcRecord = records
      .map((r) => r.join(''))
      .find((r) => r.startsWith('v=DMARC1'))

    if (!dmarcRecord) {
      return { record: 'DMARC', host: dmarcHost, found: false, value: null, valid: false, message: '未找到 DMARC 记录' }
    }

    // 检查 policy
    const hasPolicy = /p=(none|quarantine|reject)/.test(dmarcRecord)
    if (!hasPolicy) {
      return { record: 'DMARC', host: dmarcHost, found: true, value: dmarcRecord, valid: false, message: 'DMARC 记录缺少 p= 策略' }
    }

    return { record: 'DMARC', host: dmarcHost, found: true, value: dmarcRecord, valid: true, message: 'DMARC 记录有效 ✓' }
  } catch (err: any) {
    return { record: 'DMARC', host: dmarcHost, found: false, value: null, valid: false, message: `DNS 查询失败: ${err.code || err.message}` }
  }
}

/**
 * 验证 DKIM 记录（需指定 selector）
 */
export async function verifyDKIM(domain: string, selector: string = 'default'): Promise<DnsVerificationResult> {
  const dkimHost = `${selector}._domainkey.${domain}`
  try {
    const records = await dns.resolveTxt(dkimHost)
    const dkimRecord = records
      .map((r) => r.join(''))
      .find((r) => r.includes('v=DKIM1') || r.includes('p='))

    if (!dkimRecord) {
      return { record: 'DKIM', host: dkimHost, found: false, value: null, valid: false, message: `未找到 DKIM 记录（selector: ${selector}）` }
    }

    // 检查是否有公钥
    if (dkimRecord.includes('p=') && !dkimRecord.includes('p=;') && dkimRecord.match(/p=([^;\s]+)/)?.[1]) {
      return { record: 'DKIM', host: dkimHost, found: true, value: dkimRecord, valid: true, message: 'DKIM 记录有效 ✓' }
    }

    return { record: 'DKIM', host: dkimHost, found: true, value: dkimRecord, valid: false, message: 'DKIM 记录缺少公钥 (p=)' }
  } catch (err: any) {
    return { record: 'DKIM', host: dkimHost, found: false, value: null, valid: false, message: `DNS 查询失败: ${err.code || err.message}` }
  }
}

/**
 * L4: 根据 SMTP Host 推断 DKIM selector
 * 常见服务商的 DKIM selector：
 * - Google Workspace: google
 * - Microsoft 365: selector1 / selector2
 * - QQ 企业邮: default
 * - 阿里企业邮: default
 * - Zoho: zoho
 * - SendGrid: s1 / s2
 * - Mailgun: mailo / k1
 * - Amazon SES: selector
 */
export function inferDkimSelector(smtpHost: string): string {
  const host = smtpHost.toLowerCase()
  if (host.includes('gmail') || host.includes('google')) return 'google'
  if (host.includes('outlook') || host.includes('microsoft') || host.includes('hotmail') || host.includes('office365')) return 'selector1'
  if (host.includes('zoho')) return 'zoho'
  if (host.includes('sendgrid')) return 's1'
  if (host.includes('mailgun')) return 'mailo'
  if (host.includes('amazonses') || host.includes('aws')) return 'selector'
  if (host.includes('yahoo')) return 's2048'
  return 'default'
}

/**
 * 批量验证域名的所有 DNS 记录
 * @param smtpHost SMTP 主机（用于推断 DKIM selector）
 */
export async function verifyAllDnsRecords(domain: string, smtpHost?: string): Promise<DnsVerificationResult[]> {
  const selector = smtpHost ? inferDkimSelector(smtpHost) : 'default'
  const [spf, dmarc, dkim] = await Promise.all([
    verifySPF(domain),
    verifyDMARC(domain),
    verifyDKIM(domain, selector),
  ])
  return [spf, dkim, dmarc]
}
