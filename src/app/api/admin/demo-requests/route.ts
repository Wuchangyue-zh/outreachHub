import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success || !auth.userId) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
    if (!await requirePlatformAdmin(auth.userId)) return errorResponse(ErrorCodes.FORBIDDEN, 'Forbidden', 403)

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)))

    const where: any = {}
    if (status && ['pending', 'contacted', 'converted', 'rejected'].includes(status)) where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.demoRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.demoRequest.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
