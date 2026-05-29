import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const industry = searchParams.get('industry') || ''
    const country = searchParams.get('country') || ''

    const skip = (page - 1) * limit
    const where: any = { tenantId: auth.tenantId }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { domain: { contains: search, mode: 'insensitive' } },
        { website: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (industry) where.industry = { contains: industry, mode: 'insensitive' }
    if (country) where.countryCode = country

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.company.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: companies,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const body = await req.json()
    const company = await prisma.company.create({
      data: { ...body, tenantId: auth.tenantId },
    })
    return NextResponse.json({ success: true, data: company })
  } catch (error) {
    return handleApiError(error)
  }
}
