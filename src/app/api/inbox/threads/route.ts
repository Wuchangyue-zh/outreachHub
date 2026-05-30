import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

function categoryToIntent(category: string | null): 'interested' | 'opt-out' | 'ooo' {
  switch (category) {
    case 'INTERESTED':
    case 'NEGOTIATION':
    case 'QUESTION':
    case 'REFERRAL':
      return 'interested'
    case 'UNSUBSCRIBE':
    case 'NOT_INTERESTED':
      return 'opt-out'
    case 'OUT_OF_OFFICE':
    case 'AUTO_REPLY':
      return 'ooo'
    default:
      return 'interested'
  }
}

type ThreadMessage = {
  id: string
  from: 'us' | 'them'
  senderName: string
  senderEmail: string
  subject: string
  body: string
  timestamp: string
  sortAt: Date
}

// GET /api/inbox/threads — fetch inbox threads with full conversation history
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return NextResponse.json({ success: true, data: [] })

    const contacts = await prisma.contact.findMany({
      where: { tenantId: auth.tenantId },
      include: {
        company: true,
        emails: { where: { isPrimary: true }, take: 1 },
      },
    })

    if (contacts.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const contactById = new Map(contacts.map((c) => [c.id, c]))
    const contactIdByEmail = new Map<string, string>()
    for (const contact of contacts) {
      const primaryEmail = contact.emails[0]?.address || ''
      if (primaryEmail) {
        contactIdByEmail.set(primaryEmail.toLowerCase(), contact.id)
      }
    }

    const tenantContactIds = contacts.map((c) => c.id)

    // 有客户回复的联系人（线程入口）
    const repliedContactRows = await prisma.emailLog.findMany({
      where: {
        contactId: { in: tenantContactIds },
        repliedAt: { not: null },
      },
      select: { contactId: true },
      distinct: ['contactId'],
    })

    const activeContactIds = new Set(repliedContactRows.map((r) => r.contactId))

    // 兼容历史数据：inbox 回复误用了 system-reply
    const orphanReplies = await prisma.emailLog.findMany({
      where: {
        contactId: 'system-reply',
        status: 'SENT',
        toEmail: { in: [...contactIdByEmail.keys()] },
      },
      select: { toEmail: true },
      distinct: ['toEmail'],
    })

    for (const row of orphanReplies) {
      const cid = contactIdByEmail.get(row.toEmail.toLowerCase())
      if (cid) activeContactIds.add(cid)
    }

    if (activeContactIds.size === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const activeIds = [...activeContactIds]
    const activeEmails = activeIds
      .map((id) => {
        const c = contactById.get(id)
        return c?.emails[0]?.address?.toLowerCase()
      })
      .filter(Boolean) as string[]

    const allLogs = await prisma.emailLog.findMany({
      where: {
        OR: [
          { contactId: { in: activeIds } },
          {
            contactId: 'system-reply',
            toEmail: { in: activeEmails, mode: 'insensitive' },
            status: 'SENT',
          },
        ],
      },
      orderBy: [{ sentAt: 'asc' }, { createdAt: 'asc' }],
    })

    const logsByContact = new Map<string, typeof allLogs>()
    for (const log of allLogs) {
      let contactId = log.contactId
      if (contactId === 'system-reply') {
        contactId = contactIdByEmail.get(log.toEmail.toLowerCase()) || contactId
      }
      if (!activeContactIds.has(contactId)) continue

      const list = logsByContact.get(contactId) || []
      list.push(log)
      logsByContact.set(contactId, list)
    }

    const threads = activeIds
      .map((contactId) => {
        const contact = contactById.get(contactId)
        const logs = logsByContact.get(contactId) || []
        if (!contact || logs.length === 0) return null

        const contactEmail = contact.emails[0]?.address || logs[0]?.toEmail || ''
        const messages: ThreadMessage[] = []

        for (const log of logs) {
          const outboundBody = log.htmlContent || log.content || log.subject || ''
          const sentAt = log.sentAt || log.createdAt

          messages.push({
            id: `msg-out-${log.id}`,
            from: 'us',
            senderName: log.fromEmail || 'OutreachHub',
            senderEmail: log.fromEmail,
            subject: log.subject,
            body: outboundBody,
            timestamp: formatDateTime(sentAt),
            sortAt: sentAt,
          })

          if (log.repliedAt) {
            const replyBody = log.replyBody || log.content || log.subject || ''
            messages.push({
              id: `msg-in-${log.id}`,
              from: 'them',
              senderName: contact.fullName || contactEmail,
              senderEmail: contactEmail,
              subject: `Re: ${log.subject}`,
              body: replyBody,
              timestamp: formatDateTime(log.repliedAt),
              sortAt: log.repliedAt,
            })
          }
        }

        messages.sort((a, b) => a.sortAt.getTime() - b.sortAt.getTime())

        const latestReplyLog = [...logs].reverse().find((l) => l.repliedAt)
        const latestMessage = messages[messages.length - 1]
        const companyName = contact.company?.name || ''
        const countryCode = contact.countryCode || ''
        const countryFlag = countryCode ? getFlagEmoji(countryCode) : ''

        return {
          id: `thread-${contactId}`,
          contactId,
          contactName: contact.fullName || contactEmail,
          contactEmail,
          company: companyName,
          country: `${countryFlag} ${contact.country || ''}`.trim() || 'Unknown',
          intent: categoryToIntent(latestReplyLog?.replyCategory ?? null),
          lastSnippet: truncate(stripHtml(latestMessage?.body || ''), 80),
          lastTime: formatRelativeTime(latestMessage?.sortAt || new Date()),
          lastActivityAt: latestMessage?.sortAt?.getTime() || 0,
          unread: logs.some((l) => l.repliedAt && !l.tracked),
          messages: messages.map(({ sortAt: _, ...msg }) => msg),
          aiDraft: '',
          emailLogIds: logs.map((l) => l.id),
        }
      })
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .sort((a, b) => (b.lastActivityAt || 0) - (a.lastActivityAt || 0))
      .map(({ lastActivityAt: _, ...thread }) => thread)

    return NextResponse.json({ success: true, data: threads })
  } catch (error) {
    return handleApiError(error)
  }
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN')
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}
