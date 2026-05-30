import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emailEvents } from '@/lib/events'
import { incrementTenantStat } from '@/lib/stats-aggregate'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { emailLogId, eventType } = body

    if (!emailLogId || !eventType) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailLogId },
      include: { campaign: true },
    })

    if (!emailLog) {
      return NextResponse.json({ success: false, error: 'Email log not found' }, { status: 404 })
    }

    const now = new Date()
    let updateData: any = {}

    switch (eventType) {
      case 'opened':
        updateData = {
          openedAt: emailLog.openedAt || now,
          openedCount: { increment: 1 },
          status: 'OPENED',
        }
        break
      case 'clicked':
        updateData = {
          clickedAt: emailLog.clickedAt || now,
          clickedCount: { increment: 1 },
          status: 'CLICKED',
        }
        break
      case 'replied':
        updateData = {
          repliedAt: now,
          status: 'REPLIED',
        }
        break
      default:
        return NextResponse.json({ success: false, error: 'Invalid event type' }, { status: 400 })
    }

    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: updateData,
    })

    // Emit event for real-time notifications
    emailEvents.emit({
      type: `email:${eventType}` as any,
      emailLogId,
      toEmail: emailLog.toEmail,
      subject: emailLog.subject,
      campaignId: emailLog.campaignId || undefined,
      contactId: emailLog.contactId,
      tenantId: emailLog.campaign?.tenantId || undefined,
      timestamp: Date.now(),
    })

    const tenantId = emailLog.campaign?.tenantId
    if (tenantId) {
      if (eventType === 'opened') await incrementTenantStat(tenantId, 'emailsOpened')
      if (eventType === 'replied') await incrementTenantStat(tenantId, 'emailsReplied')
    }

    // #9: Campaign 统计由 EmailLog 聚合同步，不在此处 increment

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Email track event error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
