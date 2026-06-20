import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAuth, hasPermission, canReadContacts, tenantWhere } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { rateLimit, consumeApiKeyRateLimit, type RateLimitHeaders } from '@/lib/rate-limit'
import { checkContactLimit } from '@/lib/plan-limits'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

export async function GET(req: NextRequest) {
  const auth = await resolveAuth(req)
  if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
  if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '需要租户关联', 403)
  if (!canReadContacts(auth)) return errorResponse(ErrorCodes.FORBIDDEN, '权限不足', 403)

  let rateLimitHeaders: RateLimitHeaders | undefined
  if (auth.apiKeyId) {
    const result = await consumeApiKeyRateLimit(auth.apiKeyId, auth.apiKeyRateLimit || 100)
    if (result.response) return result.response
    rateLimitHeaders = result.headers
  } else {
    const response = await limiter.check(req, 30)
    if (response) return response
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    const where: any = tenantWhere(auth.tenantId)
    if (status) where.status = status
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { emails: { some: { address: { contains: search, mode: 'insensitive' } } } },
      ]
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: { emails: true, company: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: contacts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }, { headers: rateLimitHeaders })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  const auth = await resolveAuth(req)
  if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
  if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '需要租户关联', 403)
  if (!hasPermission(auth.role, 'contacts:manage', auth.effectivePermissions)) return errorResponse(ErrorCodes.FORBIDDEN, '权限不足', 403)

  let rateLimitHeaders: RateLimitHeaders | undefined
  if (auth.apiKeyId) {
    const result = await consumeApiKeyRateLimit(auth.apiKeyId, auth.apiKeyRateLimit || 100)
    if (result.response) return result.response
    rateLimitHeaders = result.headers
  } else {
    const response = await limiter.check(req, 10)
    if (response) return response
  }

  try {
    const limitCheck = await checkContactLimit(auth.tenantId)
    if (!limitCheck.allowed) {
      return errorResponse(ErrorCodes.FORBIDDEN, `联系人数量已达上限（${limitCheck.current}/${limitCheck.max}）`, 403)
    }

    const body = await req.json()
    const { fullName, firstName, lastName, title, companyId, emails, tags, notes } = body

    if (!fullName && !firstName) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'fullName 或 firstName 为必填项', 400)
    }

    const name = fullName || `${firstName || ''} ${lastName || ''}`.trim()

    if (companyId) {
      const company = await prisma.company.findFirst({
        where: { id: companyId, ...tenantWhere(auth.tenantId) },
        select: { id: true },
      })
      if (!company) return errorResponse(ErrorCodes.NOT_FOUND, '公司不存在', 404)
    }

    const contact = await prisma.contact.create({
      data: {
        tenantId: auth.tenantId,
        fullName: name,
        firstName,
        lastName,
        title,
        companyId,
        tags: tags || [],
        notes,
      },
      include: { emails: true },
    })

    // Create emails if provided
    if (emails && emails.length > 0) {
      await prisma.contactEmail.createMany({
        data: emails.map((email: string, i: number) => ({
          contactId: contact.id,
          address: email,
          isPrimary: i === 0,
        })),
      })
    }

    const fullContact = await prisma.contact.findUnique({
      where: { id: contact.id },
      include: { emails: true, company: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ success: true, data: fullContact }, { status: 201, headers: rateLimitHeaders })
  } catch (error) {
    return handleApiError(error)
  }
}
