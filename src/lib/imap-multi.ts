import Imap from 'imap'
import { simpleParser, ParsedMail } from 'mailparser'
import { prisma } from '@/lib/prisma'
import { classifyReply, type ClassificationResult } from './reply-classifier'
import { safeDecrypt } from './encryption'

export interface IMAPAccountConfig {
  id: string
  email: string
  imapHost: string
  imapPort: number
  imapUser: string
  imapPassword: string
}

export interface FetchedEmail {
  messageId: string
  inReplyTo: string | null
  subject: string
  from: string
  to: string
  date: Date
  text: string
  html: string
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
    }))
}

/**
 * 使用单个 IMAP 账户获取邮件
 */
async function fetchEmailsFromAccount(
  config: IMAPAccountConfig,
  since?: Date,
  limit: number = 50
): Promise<FetchedEmail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.imapUser,
      password: config.imapPassword,
      host: config.imapHost,
      port: config.imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connectionTimeout: 30000,
      authTimeout: 30000,
    })

    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err) => {
        if (err) {
          imap.end()
          reject(err)
          return
        }

        const searchCriteria: any[] = ['UNSEEN']
        if (since) {
          searchCriteria.push(['SINCE', since])
        }

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

          // 限制结果数量
          const messageIds = results.slice(-limit)
          const fetchedEmails: FetchedEmail[] = []

          const fetch = imap.fetch(messageIds, { bodies: '' })

          fetch.on('message', (msg) => {
            msg.on('body', (stream: any) => {
              simpleParser(stream, async (err: any, parsed: ParsedMail) => {
                if (err) {
                  console.error(`[${config.email}] Error parsing email:`, err)
                  return
                }

                fetchedEmails.push({
                  messageId: parsed.messageId || '',
                  inReplyTo: parsed.inReplyTo || null,
                  subject: parsed.subject || '',
                  from: parsed.from?.text || '',
                  to: Array.isArray(parsed.to)
                    ? parsed.to.map(t => t.text || '').join(', ')
                    : (parsed.to?.text || ''),
                  date: parsed.date || new Date(),
                  text: parsed.text || '',
                  html: parsed.html || '',
                })

                if (fetchedEmails.length === messageIds.length) {
                  imap.end()
                  resolve(fetchedEmails)
                }
              })
            })
          })

          fetch.once('error', (err) => {
            imap.end()
            reject(err)
          })

          fetch.once('end', () => {
            imap.end()
            if (fetchedEmails.length < messageIds.length) {
              resolve(fetchedEmails)
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
  if (!email.inReplyTo) {
    return false
  }

  // 查找原始邮件日志
  const originalLog = await prisma.emailLog.findFirst({
    where: { messageId: email.inReplyTo },
  })

  if (!originalLog) {
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

        console.log(`[IMAP] ${account.email}: found ${replyCount} replies`)
      } catch (error: any) {
        result.failedAccounts++
        result.details.push({
          email: account.email,
          success: false,
          error: error.message,
        })

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
