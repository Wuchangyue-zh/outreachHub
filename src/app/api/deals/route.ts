import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

export async function GET(req: NextRequest) {
  const rateLimitResult = await limiter.check(req, 30)
  if (rateLimitResult) return rateLimitResult

  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const stage = searchParams.get('stage') || ''
    const ownerId = searchParams.get('ownerId') || ''
    const contactId = searchParams.get('contactId') || ''
    const companyId = searchParams.get('companyId') || ''
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    const where: any = { tenantId: auth.tenantId }
    if (stage) where.stage = stage
    if (ownerId) where.ownerId = ownerId
    if (contactId) where.contactId = contactId
    if (companyId) where.companyId = companyId
    if (search) {
      where.title = { contains: search, mode: 'insensitive' }
    }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: {
          contact: { select: { id: true, fullName: true } },
          company: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.deal.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: deals,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  const rateLimitResult = await limiter.check(req, 10)
  if (rateLimitResult) return rateLimitResult

  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    if (!hasPermission(auth.role, 'deals:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要商机管理权限', 403)
    }

    const body = await req.json()
    const { title, stage, amount, currency, expectedClose, probability, notes, contactId, companyId, ownerId } = body

    if (!title) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '交易标题为必填项', 400)
    }

    const dealStage = stage || 'LEAD'
    const isClosed = dealStage === 'WON' || dealStage === 'LOST'

    const deal = await prisma.deal.create({
      data: {
        title,
        stage: dealStage,
        amount: amount ?? null,
        currency: currency || 'USD',
        expectedClose: expectedClose ? new Date(expectedClose) : null,
        probability: probability ?? null,
        notes: notes ?? null,
        contactId: contactId ?? null,
        companyId: companyId ?? null,
        ownerId: ownerId ?? auth.userId ?? null,
        tenantId: auth.tenantId,
        stageChangedAt: new Date(),
        closedAt: isClosed ? new Date() : null,
      },
      include: {
        contact: { select: { id: true, fullName: true } },
        company: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: deal })
  } catch (error) {
    return handleApiError(error)
  }
}
