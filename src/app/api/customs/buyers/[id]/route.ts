/**
 * N2c: 海关买家详情 API
 * GET /api/customs/buyers/[id]
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, tenantWhere } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { getCustomsProvider } from '@/lib/data-providers/customs'
import { calculatePurchaseIntentScore, generateBuyerAiSummary } from '@/lib/customs-scoring'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    // 优先从 DB 读取已有 profile
    const profile = await prisma.customsBuyerProfile.findFirst({
      where: tenantWhere(auth.tenantId, { id }),
      include: { company: { select: { id: true, name: true, domain: true } } },
    })

    if (profile) {
      return NextResponse.json({
        success: true,
        data: {
          id: profile.id,
          companyName: profile.companyName,
          domain: profile.domain,
          country: profile.country,
          countryCode: profile.countryCode,
          totalShipments: profile.totalShipments,
          totalAmountUsd: profile.totalAmountUsd,
          lastShipmentDate: profile.lastShipmentDate?.toISOString() || null,
          firstShipmentDate: profile.firstShipmentDate?.toISOString() || null,
          supplierCount: profile.supplierCount,
          topSuppliers: profile.topSuppliers,
          topHsCodes: profile.topHsCodes,
          avgShipmentAmount: profile.avgShipmentAmount,
          purchaseIntentScore: profile.purchaseIntentScore,
          scoreBreakdown: profile.scoreBreakdown,
          aiSummary: profile.aiSummary,
          importedAsContact: profile.importedAsContact,
          company: profile.company,
        },
      })
    }

    // DB 未命中，从 Provider 获取
    const provider = getCustomsProvider()
    const detail = await provider.getBuyerDetail(id)

    if (!detail) {
      return errorResponse(ErrorCodes.NOT_FOUND, '未找到该买家', 404)
    }

    // 计算评分
    const score = calculatePurchaseIntentScore({
      totalShipments: detail.totalShipments,
      totalAmountUsd: detail.totalAmountUsd,
      supplierCount: detail.supplierCount,
      lastShipmentDate: detail.lastShipmentDate,
      topSuppliers: detail.topSuppliers,
      shipments: detail.shipments,
    })

    // 缓存到 DB
    try {
      const newProfile = await prisma.customsBuyerProfile.create({
        data: {
          tenantId: auth.tenantId,
          companyName: detail.companyName,
          domain: detail.domain || null,
          country: detail.country || null,
          countryCode: detail.countryCode || null,
          totalShipments: detail.totalShipments,
          totalAmountUsd: detail.totalAmountUsd,
          lastShipmentDate: detail.lastShipmentDate ? new Date(detail.lastShipmentDate) : null,
          firstShipmentDate: detail.firstShipmentDate ? new Date(detail.firstShipmentDate) : null,
          supplierCount: detail.supplierCount,
          topSuppliers: detail.topSuppliers as any,
          topHsCodes: detail.topHsCodes as any,
          avgShipmentAmount: detail.avgShipmentAmount || null,
          purchaseIntentScore: score.total,
          scoreBreakdown: score.breakdown as any,
        },
      })

      // 异步生成 AI 摘要
      generateBuyerAiSummary(
        {
          companyName: detail.companyName,
          country: detail.country,
          totalShipments: detail.totalShipments,
          totalAmountUsd: detail.totalAmountUsd,
          supplierCount: detail.supplierCount,
          lastShipmentDate: detail.lastShipmentDate,
          topHsCodes: detail.topHsCodes,
        },
        score
      ).then(async (summary) => {
        try {
          await prisma.customsBuyerProfile.update({
            where: { id: newProfile.id },
            data: { aiSummary: summary },
          })
        } catch { /* ignore */ }
      }).catch(() => {})

      return NextResponse.json({
        success: true,
        data: {
          ...detail,
          purchaseIntentScore: score.total,
          scoreBreakdown: score.breakdown,
          profileId: newProfile.id,
        },
      })
    } catch {
      // DB 写入失败仍返回数据
      return NextResponse.json({
        success: true,
        data: {
          ...detail,
          purchaseIntentScore: score.total,
          scoreBreakdown: score.breakdown,
        },
      })
    }
  } catch (error) {
    return handleApiError(error)
  }
}
