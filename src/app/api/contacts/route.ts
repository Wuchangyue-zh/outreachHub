import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { rateLimit } from '@/lib/rate-limit'
import { checkContactLimit } from '@/lib/plan-limits'
import { checkTrialStatus } from '@/lib/trial-guard'

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
    const pool = searchParams.get('pool') || ''
    const ownerId = searchParams.get('ownerId') || ''
    const publicPool = searchParams.get('publicPool') || ''

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
    if (pool) where.pool = pool
    if (ownerId) {
      if (ownerId === 'me') {
        if (!auth.userId) {
          return NextResponse.json({
            success: true,
            data: [],
            pagination: { page, limit, total: 0, pages: 0 },
          })
        }
        where.ownerId = auth.userId
      } else {
        where.ownerId = ownerId
      }
    }
    if (publicPool === 'true') where.ownerId = null

    const includePoolStats = searchParams.get('poolStats') === 'true'

    const countQueries: Promise<number>[] = [prisma.contact.count({ where })]
    if (includePoolStats && auth.userId) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      countQueries.push(
        prisma.contact.count({
          where: {
            tenantId: auth.tenantId,
            ownerId: auth.userId,
            claimedAt: { gte: todayStart },
          },
        })
      )
    }

    const [contacts, ...counts] = await Promise.all([
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
      ...countQueries,
    ])

    const total = counts[0]
    const poolStats = includePoolStats && auth.userId
      ? { claimedToday: counts[1] ?? 0 }
      : undefined

    return NextResponse.json({
      success: true,
      data: contacts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      ...(poolStats ? { poolStats } : {}),
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

    // R2b: 试用期过期检查
    const trial = await checkTrialStatus(auth.tenantId)
    if (!trial.allowed) {
      return errorResponse(ErrorCodes.FORBIDDEN,
        '试用期已结束，请升级套餐以继续使用。访问 /pricing 查看套餐方案。', 403)
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
    const { firstName, lastName, title, department, companyId: inputCompanyId, company, emails, phones, tags, notes, country, city } = body

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

    // Resolve companyId: prefer explicit companyId, fallback to company name lookup
    let resolvedCompanyId: string | null = null
    if (inputCompanyId) {
      const existing = await prisma.company.findFirst({
        where: { id: inputCompanyId, tenantId: auth.tenantId },
        select: { id: true },
      })
      if (!existing) {
        return errorResponse(ErrorCodes.NOT_FOUND, '公司不存在', 404)
      }
      resolvedCompanyId = existing.id
    } else if (company) {
      const existingCompany = await prisma.company.findFirst({
        where: { name: { equals: company, mode: 'insensitive' }, tenantId: auth.tenantId },
      })
      if (existingCompany) {
        resolvedCompanyId = existingCompany.id
      } else {
        const newCompany = await prisma.company.create({
          data: { name: company, tenantId: auth.tenantId, country, city },
        })
        resolvedCompanyId = newCompany.id
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
        companyId: resolvedCompanyId,
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

    return NextResponse.json({ success: true, data: contact }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
