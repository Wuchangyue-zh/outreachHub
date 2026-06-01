/**
 * M2a: 邮箱格式推测 + MX 记录校验
 * 根据 firstname/lastname/domain 生成常见邮箱 pattern
 */
import { promises as dns } from 'dns'

/** 常见邮箱格式 pattern */
const EMAIL_PATTERNS = [
  '{first}.{last}@{domain}',     // john.doe@example.com
  '{first}{last}@{domain}',      // johndoe@example.com
  '{f}{last}@{domain}',          // jdoe@example.com
  '{first}_{last}@{domain}',     // john_doe@example.com
  '{first}-{last}@{domain}',     // john-doe@example.com
  '{first}@{domain}',            // john@example.com
  '{last}@{domain}',             // doe@example.com
  '{f}.{last}@{domain}',         // j.doe@example.com
  '{first}{l}@{domain}',         // johnd@example.com
  '{f}{l}@{domain}',             // jd@example.com
]

/**
 * 根据姓名和域名生成候选邮箱列表
 */
export function generateEmailCandidates(
  firstName: string,
  lastName: string,
  domain: string
): string[] {
  const f = firstName.toLowerCase().trim()
  const l = lastName.toLowerCase().trim()
  const first = f
  const last = l
  const d = domain.toLowerCase().trim().replace(/^@/, '')

  return EMAIL_PATTERNS
    .map((pattern) =>
      pattern
        .replace('{first}', first)
        .replace('{last}', last)
        .replace('{f}', f.charAt(0))
        .replace('{l}', l.charAt(0))
        .replace('{domain}', d)
    )
    .filter((email, i, arr) => arr.indexOf(email) === i) // 去重
}

/**
 * 验证域名是否有 MX 记录（粗粒度邮箱域名校验）
 */
export async function hasMxRecord(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveMx(domain)
    return records.length > 0
  } catch {
    return false
  }
}

/**
 * 验证邮箱格式是否合法（正则）
 */
export function isValidEmailFormat(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

/**
 * 检查是否为一次性邮箱域名
 */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'dispostable.com', '10minutemail.com', 'trashmail.com', 'fakeinbox.com',
  'tempail.com', 'tempr.email', 'temp-mail.org', 'guerrillamail.info',
])

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false
}
