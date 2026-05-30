import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { generateCampaignEmail } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const body = await req.json()
    const { productPrompt, tone, productId } = body

    if (!productPrompt?.trim() && !productId) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '请输入产品描述或选择产品', 400)
    }

    // D1: 若选了 productId，读取产品信息注入 prompt
    let enrichedPrompt = productPrompt?.trim() || ''
    if (productId) {
      const product = await prisma.product.findFirst({
        where: { id: productId, tenantId: auth.tenantId },
        select: { name: true, description: true, features: true, category: true, price: true, currency: true },
      })
      if (product) {
        const parts = [`产品名称：${product.name}`]
        if (product.description) parts.push(`产品描述：${product.description}`)
        if (product.category) parts.push(`品类：${product.category}`)
        if (product.features?.length) parts.push(`核心卖点：${product.features.join('、')}`)
        if (product.price != null) parts.push(`参考价格：${product.price} ${product.currency}`)
        if (enrichedPrompt) parts.push(`补充说明：${enrichedPrompt}`)
        enrichedPrompt = parts.join('\n')
      }
    }

    if (!enrichedPrompt) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '请输入产品描述', 400)
    }

    const email = await generateCampaignEmail(enrichedPrompt, tone || 'professional')

    if (!email) {
      return errorResponse(ErrorCodes.INTERNAL_ERROR, 'AI 未返回有效内容', 500)
    }

    return NextResponse.json({
      success: true,
      data: { email },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
