import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { rateLimit } from '@/lib/rate-limit'
import { checkContactLimit } from '@/lib/plan-limits'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

export async function GET(req: NextRequest) {
  const rateLimitResult = await limiter.check(req, 30)
  if (rateLimitResult) return rateLimitResult

  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const country = searchParams.get('country') || ''
    const tags = searchParams.get('tags')?.split(',') || []

    const skip = (page - 1) * limit

    const where: any = { tenantId: auth.tenantId }
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { emails: { some: { address: { contains: search, mode: 'insensitive' } } } },
      ]
    }
    if (status) where.status = status
    if (country) where.countryCode = country
    if (tags.length > 0 && tags[0] !== '') {
      where.tags = { hasSome: tags }
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          emails: true,
          company: { select: { id: true, name: true, domain: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: contacts,
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
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    // #48: 创建联系人需要 contacts:manage 权限
    if (!hasPermission(auth.role, 'contacts:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要客户管理权限', 403)
    }

    // #46: 检查联系人数量限额
    const limitCheck = await checkContactLimit(auth.tenantId)
    if (!limitCheck.allowed) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        `联系人数量已达上限（${limitCheck.current}/${limitCheck.max}），请升级套餐`,
        403
      )
    }

    const body = await req.json()
    const { firstName, lastName, title, department, company, emails, phones, tags, notes, country, city } = body

    if (!firstName || !emails || emails.length === 0) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '姓名和邮箱为必填项', 400)
    }

    // Check if email already exists within the same tenant
    const existingEmail = await prisma.contactEmail.findFirst({
      where: { address: emails[0], contact: { tenantId: auth.tenantId } },
    })
    if (existingEmail) {
      return errorResponse(ErrorCodes.CONFLICT, '该邮箱已被其他客户使用', 409)
    }

    // Create or find company within the same tenant
    let companyId = null
    if (company) {
      const existingCompany = await prisma.company.findFirst({
        where: { name: { equals: company, mode: 'insensitive' }, tenantId: auth.tenantId },
      })
      if (existingCompany) {
        companyId = existingCompany.id
      } else {
        const newCompany = await prisma.company.create({
          data: { name: company, tenantId: auth.tenantId, country, city },
        })
        companyId = newCompany.id
      }
    }

    const contact = await prisma.contact.create({
      data: {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName || ''}`.trim(),
        title,
        department,
        tenantId: auth.tenantId,
        companyId,
        emails: {
          create: emails.map((email: string, i: number) => ({
            address: email,
            isPrimary: i === 0,
          })),
        },
        phones: phones || [],
        country,
        city,
        tags: tags || [],
        notes,
      },
      include: { emails: true, company: true },
    })

    return NextResponse.json({ success: true, data: contact })
  } catch (error) {
    return handleApiError(error)
  }
}
