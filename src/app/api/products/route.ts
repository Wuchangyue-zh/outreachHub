import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

/**
 * GET /api/products
 * 获取产品列表
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''

    const where: any = {
      tenantId: auth.tenantId,
      isActive: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (category) {
      where.category = category
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/products
 * 创建新产品
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const body = await req.json()
    const { name, description, category, price, currency, imageUrl, websiteUrl, features, tags } = body

    if (!name) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '产品名称为必填项', 400)
    }

    const product = await prisma.product.create({
      data: {
        tenantId: auth.tenantId,
        name,
        description: description || null,
        category: category || null,
        price: price ? parseFloat(price) : null,
        currency: currency || 'USD',
        imageUrl: imageUrl || null,
        websiteUrl: websiteUrl || null,
        features: features || [],
        tags: tags || [],
      },
    })

    return NextResponse.json({
      success: true,
      data: product,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
