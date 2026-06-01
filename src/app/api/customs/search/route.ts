/**
 * N2b: 海关数据搜索 API
 * GET /api/customs/search?hsCode=&country=&keyword=&page=&limit=
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { rateLimit } from '@/lib/rate-limit'
import { getCustomsProvider } from '@/lib/data-providers/customs'
import { calculatePurchaseIntentScore, generateBuyerAiSummary } from '@/lib/customs-scoring'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    // N2b: 限流（20 req/min — 海关 API 查询成本高）
    const rateLimitResult = await limiter.check(req, 20)
    if (rateLimitResult) return rateLimitResult

    const { searchParams } = new URL(req.url)
    const hsCode = searchParams.get('hsCode') || undefined
    const country = searchParams.get('country') || undefined
    const keyword = searchParams.get('keyword') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '25', 10), 100)

    if (!hsCode && !country && !keyword) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '请至少提供 HS 编码、国家或关键词之一', 400)
    }

    // 调用 Provider 搜索
    const provider = getCustomsProvider()
    const buyers = await provider.searchBuyers({
      hsCode,
      country,
      keyword,
      dateFrom,
      dateTo,
      page,
      perPage: limit,
    })

    // 对已有买家附加缓存评分；对新买家实时计算并缓存
    const enriched = await Promise.all(
      buyers.map(async (buyer) => {
        // 查找已有 profile
        const existing = await prisma.customsBuyerProfile.findFirst({
          where: {
            tenantId: auth.tenantId,
            companyName: buyer.companyName,
          },
        })

        if (existing) {
          return {
            ...buyer,
            purchaseIntentScore: existing.purchaseIntentScore ?? buyer.purchaseIntentScore,
            importedAsContact: existing.importedAsContact,
            profileId: existing.id,
          }
        }

        // 新买家：计算评分
        const score = calculatePurchaseIntentScore({
          totalShipments: buyer.totalShipments,
          totalAmountUsd: buyer.totalAmountUsd,
          supplierCount: buyer.supplierCount,
          lastShipmentDate: buyer.lastShipmentDate,
          topSuppliers: buyer.topSuppliers,
        })

        // 缓存到 DB
        try {
          const profile = await prisma.customsBuyerProfile.create({
            data: {
              tenantId: auth.tenantId,
              companyName: buyer.companyName,
              domain: buyer.domain || null,
              country: buyer.country || null,
              countryCode: buyer.countryCode || null,
              totalShipments: buyer.totalShipments,
              totalAmountUsd: buyer.totalAmountUsd,
              lastShipmentDate: buyer.lastShipmentDate ? new Date(buyer.lastShipmentDate) : null,
              supplierCount: buyer.supplierCount,
              topSuppliers: buyer.topSuppliers as any,
              topHsCodes: buyer.topHsCodes as any,
              purchaseIntentScore: score.total,
              scoreBreakdown: score.breakdown as any,
            },
          })

          // 异步生成 AI 摘要（不阻塞响应）
          generateBuyerAiSummary(
            {
              companyName: buyer.companyName,
              country: buyer.country,
              totalShipments: buyer.totalShipments,
              totalAmountUsd: buyer.totalAmountUsd,
              supplierCount: buyer.supplierCount,
              lastShipmentDate: buyer.lastShipmentDate,
              topHsCodes: buyer.topHsCodes,
            },
            score
          ).then(async (summary) => {
            try {
              await prisma.customsBuyerProfile.update({
                where: { id: profile.id },
                data: { aiSummary: summary },
              })
            } catch { /* ignore */ }
          }).catch(() => {})

          return {
            ...buyer,
            purchaseIntentScore: score.total,
            importedAsContact: false,
            profileId: profile.id,
          }
        } catch {
          return { ...buyer, purchaseIntentScore: score.total }
        }
      })
    )

    // 记录搜索历史
    if (auth.userId) {
      try {
        await prisma.customsSearch.create({
          data: {
            userId: auth.userId,
            tenantId: auth.tenantId,
            hsCode: hsCode || null,
            country: country || null,
            keyword: keyword || null,
            resultCount: enriched.length,
            filters: { hsCode, country, keyword, dateFrom, dateTo, page, limit },
          },
        })
      } catch { /* non-critical */ }
    }

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: {
        page,
        limit,
        total: enriched.length, // Provider 侧分页，此处为当页数
        hasMore: enriched.length === limit,
      },
      provider: provider.name,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
