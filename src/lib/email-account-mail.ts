import nodemailer from 'nodemailer'
import { prisma } from './prisma'
import { safeDecrypt } from './encryption'

export interface SendAccountMailOptions {
  emailAccountId: string
  to: string
  subject: string
  text?: string
  html?: string
  from?: string
  attachments?: Array<{ filename: string; content: Buffer }>
}

export interface EmailAccountConfig {
  id: string
  email: string
  displayName: string | null
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
}

/**
 * 从数据库加载 EmailAccount 配置
 */
export async function getEmailAccount(accountId: string): Promise<EmailAccountConfig> {
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      email: true,
      displayName: true,
      smtpHost: true,
      smtpPort: true,
      smtpUser: true,
      smtpPassword: true,
      isActive: true,
    },
  })

  if (!account) {
    throw new Error(`EmailAccount not found: ${accountId}`)
  }

  if (!account.isActive) {
    throw new Error(`EmailAccount is inactive: ${accountId}`)
  }

  return account
}

/**
 * 根据 EmailAccount 创建 transporter
 */
export async function createAccountTransporter(accountId: string) {
  const account = await getEmailAccount(accountId)

  // P1-4: 解密密码（支持向后兼容未加密的密码）
  const decryptedPassword = safeDecrypt(account.smtpPassword)

  return nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpPort === 465, // 465 端口默认 SSL
    auth: {
      user: account.smtpUser,
      pass: decryptedPassword,
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    tls: {
      rejectUnauthorized: false,
    },
  })
}

/**
 * 使用用户 EmailAccount 发送邮件
 */
export async function sendAccountMail(options: SendAccountMailOptions) {
  const account = await getEmailAccount(options.emailAccountId)
  const transporter = await createAccountTransporter(options.emailAccountId)

  const fromName = account.displayName || account.email.split('@')[0]
  const mailOptions = {
    from: options.from || `"${fromName}" <${account.email}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments,
  }

  const result = await transporter.sendMail(mailOptions)

  // 更新每日发送计数
  await prisma.emailAccount.update({
    where: { id: options.emailAccountId },
    data: { dailySent: { increment: 1 } },
  })

  return { success: true, messageId: result.messageId }
}

/**
 * 使用用户 EmailAccount 批量发送邮件
 */
export async function sendAccountBatchEmails(
  emailAccountId: string,
  emails: Array<Omit<SendAccountMailOptions, 'emailAccountId'>>
) {
  const account = await getEmailAccount(emailAccountId)
  const transporter = await createAccountTransporter(emailAccountId)

  const fromName = account.displayName || account.email.split('@')[0]
  const results: Array<{ success: boolean; messageId?: string; error?: string; to: string }> = []

  for (const email of emails) {
    try {
      const result = await transporter.sendMail({
        from: `"${fromName}" <${account.email}>`,
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: email.html,
        attachments: email.attachments,
      })
      results.push({ success: true, messageId: result.messageId, to: email.to })

      // 更新每日发送计数
      await prisma.emailAccount.update({
        where: { id: emailAccountId },
        data: { dailySent: { increment: 1 } },
      })
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        to: email.to,
      })
    }
  }

  return results
}

/**
 * 检查 EmailAccount 是否达到每日发送限制
 */
export async function checkDailyLimit(accountId: string): Promise<boolean> {
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
    select: { dailySent: true, dailyLimit: true, lastResetAt: true },
  })

  if (!account) {
    throw new Error(`EmailAccount not found: ${accountId}`)
  }

  // 检查是否需要重置每日计数（跨天重置）
  const now = new Date()
  const lastReset = new Date(account.lastResetAt)
  const isNewDay = now.getDate() !== lastReset.getDate() ||
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear()

  if (isNewDay) {
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: { dailySent: 0, lastResetAt: now },
    })
    return true
  }

  return account.dailySent < account.dailyLimit
}

// selectBestAccount 已移至 lib/select-email-account.ts（更完善的实现）
