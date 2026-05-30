import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/products/[id]
 * 获取产品详情
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const { id } = await ctx.params

    const product = await prisma.product.findFirst({
      where: {
        id,
        tenantId: auth.tenantId,
      },
    })

    if (!product) {
      return errorResponse(ErrorCodes.NOT_FOUND, '产品不存在或无权访问', 404)
    }

    return NextResponse.json({
      success: true,
      data: product,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PUT /api/products/[id]
 * 更新产品
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const { id } = await ctx.params
    const body = await req.json()

    // 验证产品存在且属于当前租户
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        tenantId: auth.tenantId,
      },
    })

    if (!existingProduct) {
      return errorResponse(ErrorCodes.NOT_FOUND, '产品不存在或无权访问', 404)
    }

    const { name, description, category, price, currency, imageUrl, websiteUrl, features, tags, isActive } = body

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingProduct.name,
        description: description !== undefined ? description : existingProduct.description,
        category: category !== undefined ? category : existingProduct.category,
        price: price !== undefined ? (price ? parseFloat(price) : null) : existingProduct.price,
        currency: currency !== undefined ? currency : existingProduct.currency,
        imageUrl: imageUrl !== undefined ? imageUrl : existingProduct.imageUrl,
        websiteUrl: websiteUrl !== undefined ? websiteUrl : existingProduct.websiteUrl,
        features: features !== undefined ? features : existingProduct.features,
        tags: tags !== undefined ? tags : existingProduct.tags,
        isActive: isActive !== undefined ? isActive : existingProduct.isActive,
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

/**
 * DELETE /api/products/[id]
 * 删除产品（软删除）
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const { id } = await ctx.params

    // 验证产品存在且属于当前租户
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        tenantId: auth.tenantId,
      },
    })

    if (!existingProduct) {
      return errorResponse(ErrorCodes.NOT_FOUND, '产品不存在或无权访问', 404)
    }

    // 软删除：设置为不活跃
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      message: '产品已删除',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
