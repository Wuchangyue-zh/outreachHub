import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

/**
 * GET /api/tasks
 * 获取任务列表（FOLLOW_UP / OUTREACH / NURTURE）
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''

    const where: any = { tenantId: auth.tenantId }
    if (status) where.status = status
    if (type) where.type = type

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
    ])

    // 为 FOLLOW_UP 任务加载关联联系人信息
    const allContactIds = [
      ...new Set(
        tasks.flatMap((t) => [t.contactId, ...(t.contactIds || [])].filter(Boolean) as string[])
      ),
    ]
    const contacts = allContactIds.length > 0
      ? await prisma.contact.findMany({
          where: { id: { in: allContactIds }, tenantId: auth.tenantId },
          select: {
            id: true,
            fullName: true,
            firstName: true,
            emails: { select: { address: true }, take: 1 },
          },
        })
      : []
    const contactMap = new Map(contacts.map((c) => [c.id, c]))

    const enrichedTasks = tasks.map((task) => {
      const steps = (task.steps as any[]) || []
      const followUpInfo = task.type === 'FOLLOW_UP' && steps.length > 0 ? steps[0] : null
      const primaryContactId = task.contactId || task.contactIds[0]
      const contact = primaryContactId ? contactMap.get(primaryContactId) : null
      const scheduledAt =
        task.dueDate?.toISOString() ||
        task.reminderAt?.toISOString() ||
        followUpInfo?.scheduledAt ||
        null

      return {
        ...task,
        contactName: contact?.fullName || contact?.firstName || null,
        contactEmail: contact?.emails[0]?.address || null,
        followUpScheduledAt: scheduledAt,
        followUpReason: followUpInfo?.reason || null,
        originalCampaignId: followUpInfo?.originalCampaignId || null,
      }
    })

    return NextResponse.json({
      success: true,
      data: enrichedTasks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
