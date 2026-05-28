import Imap from 'imap'
import { simpleParser, ParsedMail } from 'mailparser'
import { prisma } from '@/lib/prisma'

export interface IMAPConfig {
  host: string
  port: number
  user: string
  password: string
  tls: boolean
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

export class IMAPClient {
  private config: IMAPConfig
  private imap: Imap | null = null

  constructor(config: IMAPConfig) {
    this.config = config
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap = new Imap({
        user: this.config.user,
        password: this.config.password,
        host: this.config.host,
        port: this.config.port,
        tls: this.config.tls,
        tlsOptions: { rejectUnauthorized: false },
      })

      this.imap.once('ready', () => {
        resolve()
      })

      this.imap.once('error', (err) => {
        reject(err)
      })

      this.imap.connect()
    })
  }

  async disconnect(): Promise<void> {
    if (this.imap) {
      this.imap.end()
    }
  }

  async fetchInboxEmails(since?: Date, limit: number = 50): Promise<FetchedEmail[]> {
    return new Promise((resolve, reject) => {
      if (!this.imap) {
        reject(new Error('IMAP not connected'))
        return
      }

      this.imap.openBox('INBOX', false, (err) => {
        if (err) {
          reject(err)
          return
        }

        const searchCriteria: any[] = ['UNSEEN']
        if (since) {
          searchCriteria.push(['SINCE', since])
        }

        this.imap!.search(searchCriteria, (err, results) => {
          if (err) {
            reject(err)
            return
          }

          if (!results || results.length === 0) {
            resolve([])
            return
          }

          // Limit results
          const messageIds = results.slice(-limit)
          const fetchedEmails: FetchedEmail[] = []

          const fetch = this.imap!.fetch(messageIds, { bodies: '' })

          fetch.on('message', (msg) => {
            msg.on('body', (stream: any) => {
              simpleParser(stream, async (err: any, parsed: ParsedMail) => {
                if (err) {
                  console.error('Error parsing email:', err)
                  return
                }

                fetchedEmails.push({
                  messageId: parsed.messageId || '',
                  inReplyTo: parsed.inReplyTo || null,
                  subject: parsed.subject || '',
                  from: parsed.from?.text || '',
                  to: Array.isArray(parsed.to) ? parsed.to.map(t => t.text || '').join(', ') : (parsed.to?.text || ''),
                  date: parsed.date || new Date(),
                  text: parsed.text || '',
                  html: parsed.html || '',
                })

                if (fetchedEmails.length === messageIds.length) {
                  resolve(fetchedEmails)
                }
              })
            })
          })

          fetch.once('error', reject)
          fetch.once('end', () => {
            if (fetchedEmails.length < messageIds.length) {
              resolve(fetchedEmails)
            }
          })
        })
      })
    })
  }

  async detectReplies(): Promise<number> {
    try {
      const emails = await this.fetchInboxEmails(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
      let replyCount = 0

      for (const email of emails) {
        if (email.inReplyTo) {
          // Find the original email log
          const originalLog = await prisma.emailLog.findFirst({
            where: {
              messageId: email.inReplyTo,
            },
          })

          if (originalLog) {
            // Update email log with reply info
            await prisma.emailLog.update({
              where: { id: originalLog.id },
              data: {
                repliedAt: email.date,
                status: 'REPLIED',
              },
            })

            // Update contact statistics
            await prisma.contact.update({
              where: { id: originalLog.contactId },
              data: {
                emailsReplied: { increment: 1 },
                lastEmailRepliedAt: email.date,
                status: 'INTERESTED', // Auto-update status on reply
              },
            })

            replyCount++
          }
        }
      }

      return replyCount
    } catch (error) {
      console.error('Error detecting replies:', error)
      throw error
    }
  }
}

// Singleton IMAP client
let imapClient: IMAPClient | null = null

export function getIMAPClient(): IMAPClient | null {
  return imapClient
}

export async function initializeIMAPClient(): Promise<IMAPClient | null> {
  if (!process.env.IMAP_HOST || !process.env.IMAP_USER || !process.env.IMAP_PASSWORD) {
    console.warn('IMAP not configured')
    return null
  }

  if (imapClient) {
    return imapClient
  }

  const config: IMAPConfig = {
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT || '993'),
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    tls: true,
  }

  imapClient = new IMAPClient(config)
  await imapClient.connect()
  return imapClient
}

export async function shutdownIMAPClient(): Promise<void> {
  if (imapClient) {
    await imapClient.disconnect()
    imapClient = null
  }
}
