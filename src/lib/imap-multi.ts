import Imap from 'imap'
import { simpleParser } from 'mailparser'
import { prisma } from '@/lib/prisma'
import { classifyReply, type ClassificationResult } from './reply-classifier'
import { safeDecrypt } from './encryption'
import { dispatchWebhook } from './webhook-dispatch'

export interface IMAPAccountConfig {
  id: string
  email: string
  imapHost: string
  imapPort: number
  imapUser: string
  imapPassword: string
  healthScore: number
}

export interface FetchedEmail {
  messageId: string
  inReplyTo: string | null
  references: string[]
  subject: string
  from: string
  to: string
  date: Date
  text: string
  html: string
}

function normalizeMessageId(messageId: string | null | undefined): string | null {
  if (!messageId) return null
  const trimmed = messageId.trim()
  if (!trimmed) return null
  return trimmed.startsWith('<') ? trimmed : `<${trimmed}>`
}

function collectReplyTargetIds(email: FetchedEmail): string[] {
  const ids = new Set<string>()
  for (const raw of [email.inReplyTo, ...email.references]) {
    const normalized = normalizeMessageId(raw)
    if (normalized) ids.add(normalized)
  }
  return [...ids]
}

/**
 * 从数据库加载用户的 IMAP 账户配置
 */
async function loadIMAPAccounts(userId?: string): Promise<IMAPAccountConfig[]> {
  const where: any = {
    isActive: true,
    imapHost: { not: null },
  }

  if (userId) {
    where.userId = userId
  }

  const accounts = await prisma.emailAccount.findMany({
    where,
    select: {
      id: true,
      email: true,
      imapHost: true,
      imapPort: true,
      imapUser: true,
      imapPassword: true,
      healthScore: true,
    },
  })

  // 解密密码并过滤掉配置不完整的账户
  return accounts
    .filter(a => a.imapHost && a.imapPort && a.imapUser && a.imapPassword)
    .map(a => ({
      id: a.id,
      email: a.email,
      imapHost: a.imapHost!,
      imapPort: a.imapPort!,
      imapUser: a.imapUser!,
      imapPassword: safeDecrypt(a.imapPassword!),
      healthScore: (a as any).healthScore ?? 100,
    }))
}

/**
 * 使用单个 IMAP 账户获取邮件
 */
async function fetchEmailsFromAccount(
  config: IMAPAccountConfig,
  since?: Date,
  limit: number = 100
): Promise<FetchedEmail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.imapUser,
      password: config.imapPassword,
      host: config.imapHost,
      port: config.imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    })

    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err) => {
        if (err) {
          imap.end()
          reject(err)
          return
        }

        const searchCriteria: any[] = since ? [['SINCE', since]] : ['ALL']

        imap.search(searchCriteria, (err, results) => {
          if (err) {
            imap.end()
            reject(err)
            return
          }

          if (!results || results.length === 0) {
            imap.end()
            resolve([])
            return
          }

          const messageIds = results.slice(-limit)
          const parsePromises: Array<Promise<FetchedEmail | null>> = []

          const fetch = imap.fetch(messageIds, { bodies: '' })

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              parsePromises.push(
                simpleParser(stream as any)
                  .then((parsed) => ({
                    messageId: parsed.messageId || '',
                    inReplyTo: parsed.inReplyTo || null,
                    references: Array.isArray(parsed.references)
                      ? parsed.references
                      : parsed.references
                        ? [parsed.references]
                        : [],
                    subject: parsed.subject || '',
                    from: parsed.from?.text || '',
                    to: Array.isArray(parsed.to)
                      ? parsed.to.map((t) => t.text || '').join(', ')
                      : (parsed.to?.text || ''),
                    date: parsed.date || new Date(),
                    text: parsed.text || '',
                    html: parsed.html || '',
                  }))
                  .catch((parseErr) => {
                    console.error(`[${config.email}] Error parsing email:`, parseErr)
                    return null
                  })
              )
            })
          })

          fetch.once('error', (fetchErr) => {
            imap.end()
            reject(fetchErr)
          })

          fetch.once('end', async () => {
            try {
              const parsed = await Promise.all(parsePromises)
              imap.end()
              resolve(parsed.filter((email): email is FetchedEmail => email !== null))
            } catch (fetchEndErr) {
              imap.end()
              reject(fetchEndErr)
            }
          })
        })
      })
    })

    imap.once('error', (err) => {
      reject(err)
    })

    imap.connect()
  })
}

/**
 * 处理回复邮件：更新 EmailLog 和 Contact 状态
 */
async function processReply(email: FetchedEmail): Promise<boolean> {
  const replyTargetIds = collectReplyTargetIds(email)
  if (replyTargetIds.length === 0) {
    return false
  }

  // 查找原始邮件日志（In-Reply-To / References）
  const originalLog = await prisma.emailLog.findFirst({
    where: {
      OR: replyTargetIds.map((messageId) => ({ messageId })),
    },
  })

  if (!originalLog || originalLog.repliedAt) {
    return false
  }

  // 分类回复
  const classification = classifyReply(email.text, email.subject)

  // 更新邮件日志
  await prisma.emailLog.update({
    where: { id: originalLog.id },
    data: {
      repliedAt: email.date,
      status: 'REPLIED',
      replyCategory: classification.category,
      replyConfidence: classification.confidence,
      replyKeywords: classification.keywords,
      replyBody: email.text || email.html || '', // P1-3: 存储回复正文
    },
  })

  // 根据分类更新联系人状态
  let newStatus: string | undefined
  switch (classification.category) {
    case 'INTERESTED':
    case 'NEGOTIATION':
      newStatus = 'INTERESTED'
      break
    case 'NOT_INTERESTED':
    case 'UNSUBSCRIBE':
      newStatus = 'NOT_INTERESTED'
      break
    case 'QUESTION':
    case 'REFERRAL':
      newStatus = 'QUALIFIED'
      break
  }

  // #24: OOO 自动跟进 — 创建 3 天后跟进任务
  if (classification.category === 'OUT_OF_OFFICE' && originalLog.campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: originalLog.campaignId },
      select: { tenantId: true, name: true },
    })

    const existingFollowUp = await prisma.task.findFirst({
      where: {
        type: 'FOLLOW_UP',
        status: 'PENDING',
        contactIds: { has: originalLog.contactId },
      },
    })

    if (!existingFollowUp && campaign) {
      const followUpAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      await prisma.task.create({
        data: {
          tenantId: campaign.tenantId,
          name: `OOO 跟进: ${email.from || originalLog.toEmail}`,
          type: 'FOLLOW_UP',
          status: 'PENDING',
          contactIds: [originalLog.contactId],
          steps: [{
            type: 'follow-up',
            scheduledAt: followUpAt.toISOString(),
            reason: 'OUT_OF_OFFICE',
            originalCampaignId: originalLog.campaignId,
            originalLogId: originalLog.id,
            replyBody: email.text?.slice(0, 500) || '',
          }],
        },
      }).catch((err) => console.error('[IMAP] Failed to create OOO follow-up task:', err))
    }
  }

  // 更新联系人统计
  const updateData: any = {
    emailsReplied: { increment: 1 },
    lastEmailRepliedAt: email.date,
  }
  if (newStatus) {
    updateData.status = newStatus
  }

  await prisma.contact.update({
    where: { id: originalLog.contactId },
    data: updateData,
  })

  // #9: Campaign 统计由 EmailLog 聚合同步，不在此处 increment

  // Fire-and-forget webhook dispatch for reply received
  if (originalLog.campaignId) {
    const campaignForWebhook = await prisma.campaign.findUnique({
      where: { id: originalLog.campaignId },
      select: { tenantId: true },
    }).catch(() => null)

    if (campaignForWebhook?.tenantId) {
      dispatchWebhook(campaignForWebhook.tenantId, 'reply.received', {
        contactId: originalLog.contactId,
        emailLogId: originalLog.id,
        category: classification.category,
      }).catch(() => {})
    }
  }

  return true
}

/**
 * 检查所有用户的 IMAP 账户的回复邮件
 * @param userId 可选：只检查特定用户的账户
 * @returns 处理结果统计
 */
export async function checkRepliesFromAllAccounts(userId?: string): Promise<{
  totalAccounts: number
  successAccounts: number
  failedAccounts: number
  totalReplies: number
  details: Array<{
    email: string
    success: boolean
    replyCount?: number
    error?: string
  }>
}> {
  const accounts = await loadIMAPAccounts(userId)

  const result = {
    totalAccounts: accounts.length,
    successAccounts: 0,
    failedAccounts: 0,
    totalReplies: 0,
    details: [] as Array<{
      email: string
      success: boolean
      replyCount?: number
      error?: string
    }>,
  }

  // 并发处理所有账户（限制并发数）
  const concurrency = 3
  for (let i = 0; i < accounts.length; i += concurrency) {
    const batch = accounts.slice(i, i + concurrency)

    const promises = batch.map(async (account) => {
      try {
        console.log(`[IMAP] Checking replies for ${account.email}...`)

        // 获取最近 7 天的未读邮件
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const emails = await fetchEmailsFromAccount(account, since)

        let replyCount = 0
        for (const email of emails) {
          const isReply = await processReply(email)
          if (isReply) {
            replyCount++
          }
        }

        result.successAccounts++
        result.totalReplies += replyCount
        result.details.push({
          email: account.email,
          success: true,
          replyCount,
        })

        // #19: IMAP 成功时恢复健康度（最高100）并清除错误
        await prisma.emailAccount.update({
          where: { id: account.id },
          data: {
            healthScore: { set: Math.min(100, account.healthScore + 1) },
            imapLastError: null,
            imapLastErrorAt: null,
          },
        }).catch((err) => console.error(`[IMAP] Failed to update health for ${account.email}:`, err))

        console.log(`[IMAP] ${account.email}: found ${replyCount} replies`)
      } catch (error: any) {
        result.failedAccounts++
        result.details.push({
          email: account.email,
          success: false,
          error: error.message,
        })

        // #19: IMAP 失败时降低账户健康度
        await prisma.emailAccount.update({
          where: { id: account.id },
          data: {
            healthScore: { decrement: 5 },
            imapLastError: error.message?.slice(0, 500),
            imapLastErrorAt: new Date(),
          },
        }).catch((err) => console.error(`[IMAP] Failed to update health for ${account.email}:`, err))

        console.error(`[IMAP] ${account.email} failed:`, error.message)
      }
    })

    await Promise.all(promises)
  }

  return result
}

/**
 * 检查单个 EmailAccount 的回复邮件
 */
export async function checkRepliesForAccount(emailAccountId: string): Promise<{
  success: boolean
  replyCount: number
  error?: string
}> {
  const account = await prisma.emailAccount.findUnique({
    where: { id: emailAccountId },
    select: {
      id: true,
      email: true,
      imapHost: true,
      imapPort: true,
      imapUser: true,
      imapPassword: true,
      isActive: true,
    },
  })

  if (!account || !account.isActive) {
    return { success: false, replyCount: 0, error: 'Account not found or inactive' }
  }

  if (!account.imapHost || !account.imapPort || !account.imapUser || !account.imapPassword) {
    return { success: false, replyCount: 0, error: 'IMAP not configured' }
  }

  const config: IMAPAccountConfig = {
    id: account.id,
    email: account.email,
    imapHost: account.imapHost,
    imapPort: account.imapPort,
    imapUser: account.imapUser,
    imapPassword: safeDecrypt(account.imapPassword),
    healthScore: (account as any).healthScore ?? 100,
  }

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const emails = await fetchEmailsFromAccount(config, since)

    let replyCount = 0
    for (const email of emails) {
      const isReply = await processReply(email)
      if (isReply) {
        replyCount++
      }
    }

    return { success: true, replyCount }
  } catch (error: any) {
    return { success: false, replyCount: 0, error: error.message }
  }
}
