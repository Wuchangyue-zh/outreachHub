import { prisma } from './prisma'

/**
 * #14: 标记邮件为退信（BOUNCED）并联动降低发件账户健康度
 *
 * 退信来源：
 * 1. SMTP 5xx 永久拒绝（在 sendAccountMail 捕获）
 * 2. IMAP 拉取到退信通知邮件（退信检测器）
 * 3. 手动标记（API 或管理后台）
 *
 * @param emailLogId 要标记的 EmailLog ID
 * @param reason 退信原因（可选）
 */
export async function markAsBounced(
  emailLogId: string,
  reason?: string,
  emailAccountId?: string | null
): Promise<boolean> {
  const log = await prisma.emailLog.findUnique({
    where: { id: emailLogId },
    select: {
      id: true,
      status: true,
      campaignId: true,
      fromEmail: true,
      contactId: true,
    },
  })

  if (!log) return false
  // 已经是终态则跳过
  if (['BOUNCED', 'FAILED', 'UNSUBSCRIBED'].includes(log.status)) return false

  // 更新 EmailLog 状态
  await prisma.emailLog.update({
    where: { id: emailLogId },
    data: {
      status: 'BOUNCED',
      bouncedAt: new Date(),
      bounceReason: reason || 'Unknown bounce',
    },
  })

  // #9: Campaign 统计由 EmailLog 聚合同步，不在此处 increment

  // 更新联系人退信计数
  if (log.contactId) {
    await prisma.contact.update({
      where: { id: log.contactId },
      data: { emailsBounced: { increment: 1 } },
    }).catch((err) => console.error('[bounce-handler] Failed to update contact emailsBounced:', err))
  }

  // #14: 降低发件账户健康度（退信比发送失败更严重，降 5 分）
  let accountId = emailAccountId || null
  if (!accountId && log.fromEmail) {
    const account = await prisma.emailAccount.findFirst({
      where: { email: log.fromEmail },
      select: { id: true },
    })
    accountId = account?.id || null
  }
  if (accountId) {
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: { healthScore: { decrement: 5 } },
    }).catch((err) => console.error('[bounce-handler] Failed to degrade healthScore:', err))
  }

  console.log(`[bounce-handler] EmailLog ${emailLogId} marked as BOUNCED: ${reason}`)
  return true
}

/**
 * 批量检测退信：通过 SMTP 错误码识别永久性退信
 * 5xx 错误码通常表示永久性失败（邮箱不存在、域名不存在等）
 */
export function isPermanentBounce(errorMessage: string): boolean {
  const msg = errorMessage.toLowerCase()
  // 常见永久性退信关键词
  const permanentBouncePatterns = [
    '550',           // 邮箱不存在
    '551',           // 用户不在本服务器
    '553',           // 邮箱名无效
    'user not found',
    'mailbox not found',
    'no such user',
    'no such mailbox',
    'recipient rejected',
    'address rejected',
    'domain not found',
    'relay denied',
  ]
  return permanentBouncePatterns.some((pattern) => msg.includes(pattern))
}

/**
 * 从退信邮件正文提取退信原因
 * 退信邮件通常包含原始收件人和失败原因
 */
export function extractBounceReason(body: string): string {
  // 尝试提取 Diagnostic-Code
  const diagnosticMatch = body.match(/Diagnostic-Code:\s*(.+)/i)
  if (diagnosticMatch) return diagnosticMatch[1].trim()

  // 尝试提取 Status
  const statusMatch = body.match(/Status:\s*(\d+\.\d+\.\d+)/)
  if (statusMatch) return `Status: ${statusMatch[1]}`

  // 取前 200 字符作为摘要
  return body.slice(0, 200).replace(/\s+/g, ' ').trim()
}
