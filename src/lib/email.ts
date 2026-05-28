import nodemailer from 'nodemailer'

export interface SendMailOptions {
  to: string
  subject: string
  text?: string
  html?: string
  from?: string
  attachments?: Array<{ filename: string; content: Buffer }>
}

export async function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.jafron.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    tls: {
      // Allow IP address connections without certificate validation
      rejectUnauthorized: false,
    },
  })
}

export async function sendMail(options: SendMailOptions) {
  const transporter = await createTransporter()

  const fromName = process.env.SMTP_FROM_NAME || 'OutreachHub'
  const mailOptions = {
    from: options.from || `"${fromName}" <${process.env.SMTP_USER}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments,
  }

  const result = await transporter.sendMail(mailOptions)
  return { success: true, messageId: result.messageId }
}

export async function sendBatchEmails(emails: SendMailOptions[]) {
  const transporter = await createTransporter()
  const results: Array<{ success: boolean; messageId?: string; error?: string; to: string }> = []

  for (const email of emails) {
    try {
      const fromName = process.env.SMTP_FROM_NAME || 'OutreachHub'
      const result = await transporter.sendMail({
        from: email.from || `"${fromName}" <${process.env.SMTP_USER}>`,
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: email.html,
        attachments: email.attachments,
      })
      results.push({ success: true, messageId: result.messageId, to: email.to })
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