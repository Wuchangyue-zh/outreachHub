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

// GET /api/inbox/threads — fetch inbox threads from replied EmailLogs (tenant-scoped)
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return NextResponse.json({ success: true, data: [] })

    const tenantContacts = await prisma.contact.findMany({
      where: { tenantId: auth.tenantId },
      select: { id: true },
    })
    const tenantContactIds = tenantContacts.map((c) => c.id)
    if (tenantContactIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const repliedLogs = await prisma.emailLog.findMany({
      where: {
        contactId: { in: tenantContactIds },
        repliedAt: { not: null },
      },
      include: {
        campaign: true,
      },
      orderBy: { repliedAt: 'desc' },
      take: 100,
    })

    const contactIds = [...new Set(repliedLogs.map((log) => log.contactId).filter(Boolean))]

    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds }, tenantId: auth.tenantId },
      include: { company: true },
    })
    const contactMap = new Map(contacts.map((c) => [c.id, c]))

    const threadMap = new Map<string, {
      id: string
      contactName: string
      contactEmail: string
      company: string
      country: string
      intent: 'interested' | 'opt-out' | 'ooo'
      lastSnippet: string
      lastTime: string
      unread: boolean
      messages: Array<{
        id: string
        from: 'us' | 'them'
        senderName: string
        senderEmail: string
        subject: string
        body: string
        timestamp: string
      }>
      aiDraft: string
      emailLogIds: string[]
    }>()

    for (const log of repliedLogs) {
      const contact = contactMap.get(log.contactId)
      if (!contact) continue

      const contactKey = log.contactId
      const outboundBody = log.htmlContent || log.content || log.subject || ''
      const replyBody = log.content || log.subject || ''

      if (!threadMap.has(contactKey)) {
        const companyName = contact.company?.name || ''
        const countryCode = contact.countryCode || ''
        const countryFlag = countryCode ? getFlagEmoji(countryCode) : ''

        threadMap.set(contactKey, {
          id: `thread-${contactKey}`,
          contactName: contact.fullName || log.toEmail,
          contactEmail: log.toEmail,
          company: companyName,
          country: `${countryFlag} ${contact.country || ''}`.trim() || 'Unknown',
          intent: categoryToIntent(log.replyCategory),
          lastSnippet: truncate(replyBody, 80),
          lastTime: formatRelativeTime(log.repliedAt!),
          unread: !log.tracked,
          messages: [
            {
              id: `msg-out-${log.id}`,
              from: 'us',
              senderName: log.fromEmail || 'OutreachHub',
              senderEmail: log.fromEmail,
              subject: log.subject,
              body: outboundBody,
              timestamp: log.sentAt ? formatDateTime(log.sentAt) : '',
            },
            {
              id: `msg-in-${log.id}`,
              from: 'them',
              senderName: contact.fullName || log.toEmail,
              senderEmail: log.toEmail,
              subject: `Re: ${log.subject}`,
              body: replyBody,
              timestamp: log.repliedAt ? formatDateTime(log.repliedAt) : '',
            },
          ],
          aiDraft: '',
          emailLogIds: [log.id],
        })
      } else {
        const thread = threadMap.get(contactKey)!
        thread.emailLogIds.push(log.id)
        thread.lastSnippet = truncate(replyBody, 80)
        thread.lastTime = formatRelativeTime(log.repliedAt!)
        thread.messages.push({
          id: `msg-in-${log.id}`,
          from: 'them',
          senderName: contact.fullName || log.toEmail,
          senderEmail: log.toEmail,
          subject: `Re: ${log.subject}`,
          body: replyBody,
          timestamp: log.repliedAt ? formatDateTime(log.repliedAt) : '',
        })
        thread.intent = categoryToIntent(log.replyCategory)
      }
    }

    const threads = Array.from(threadMap.values())

    return NextResponse.json({ success: true, data: threads })
  } catch (error) {
    return handleApiError(error)
  }
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
