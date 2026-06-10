/**
 * N2d: 海关买家导入到 Company/Contact + 可选 Campaign
 * POST /api/customs/import-to-campaign
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, tenantWhere, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { getCustomsProvider } from '@/lib/data-providers/customs'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    if (!hasPermission(auth.role, 'contacts:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要客户管理权限', 403)
    }

    const body = await req.json()
    const { buyerIds, campaignId } = body as { buyerIds: string[]; campaignId?: string }

    if (!Array.isArray(buyerIds) || buyerIds.length === 0) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '请提供要导入的买家 ID 列表', 400)
    }

    if (buyerIds.length > 50) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '单次最多导入 50 个买家', 400)
    }

    // 如指定 campaign，验证存在性
    if (campaignId) {
      const campaign = await prisma.campaign.findFirst({
        where: tenantWhere(auth.tenantId, { id: campaignId }),
        select: { id: true },
      })
      if (!campaign) {
        return errorResponse(ErrorCodes.NOT_FOUND, '指定的 Campaign 不存在', 404)
      }
    }

    const provider = getCustomsProvider()
    const results: Array<{ id?: string; name: string; success: boolean; error?: string }> = []

    for (const buyerId of buyerIds) {
      try {
        // 从 DB 或 Provider 获取买家信息
        let buyer: {
          companyName: string
          domain?: string | null
          country?: string | null
          countryCode?: string | null
        } | null = null

        const profile = await prisma.customsBuyerProfile.findFirst({
          where: tenantWhere(auth.tenantId, { id: buyerId }),
        })

        if (profile) {
          buyer = {
            companyName: profile.companyName,
            domain: profile.domain,
            country: profile.country,
            countryCode: profile.countryCode,
          }
        } else {
          const detail = await provider.getBuyerDetail(buyerId)
          if (detail) {
            buyer = {
              companyName: detail.companyName,
              domain: detail.domain,
              country: detail.country,
              countryCode: detail.countryCode,
            }
          }
        }

        if (!buyer) {
          results.push({ name: buyerId, success: false, error: '未找到买家信息' })
          continue
        }

        // 去重：检查 Company 是否已存在
        const existingCompany = await prisma.company.findFirst({
          where: {
            tenantId: auth.tenantId,
            OR: [
              buyer.domain ? { domain: buyer.domain } : undefined,
              { name: buyer.companyName },
            ].filter(Boolean) as any,
          },
        })

        let companyId: string

        if (existingCompany) {
          companyId = existingCompany.id
        } else {
          // 创建 Company
          const newCompany = await prisma.company.create({
            data: {
              tenantId: auth.tenantId,
              name: buyer.companyName,
              domain: buyer.domain || null,
              country: buyer.country || null,
              countryCode: buyer.countryCode || null,
              source: 'customs',
              tags: ['customs-buyer'],
            },
          })
          companyId = newCompany.id
        }

        // 创建占位 Contact（如有邮箱后续补充）
        const existingContact = await prisma.contact.findFirst({
          where: {
            tenantId: auth.tenantId,
            companyId,
            fullName: buyer.companyName,
          },
        })

        if (!existingContact) {
          await prisma.contact.create({
            data: {
              tenantId: auth.tenantId,
              companyId,
              fullName: buyer.companyName,
              firstName: null,
              lastName: null,
              title: 'Buyer / Procurement',
              country: buyer.country || null,
              countryCode: buyer.countryCode || null,
              source: 'customs',
              tags: ['customs-buyer'],
            },
          })
        }

        // 更新 profile 导入状态
        if (profile) {
          await prisma.customsBuyerProfile.update({
            where: { id: profile.id },
            data: { importedAsContact: true, importedAt: new Date() },
          })
        }

        // 关联 Campaign
        if (campaignId) {
          // 获取刚创建或已有的 contact
          const contact = existingContact || await prisma.contact.findFirst({
            where: { tenantId: auth.tenantId, companyId, fullName: buyer.companyName },
            select: { id: true },
          })

          if (contact) {
            await prisma.campaignContact.upsert({
              where: {
                campaignId_contactId: {
                  campaignId,
                  contactId: contact.id,
                },
              },
              create: {
                campaignId,
                contactId: contact.id,
                status: 'PENDING',
              },
              update: {},
            })
          }
        }

        results.push({ id: companyId, name: buyer.companyName, success: true })
      } catch (error: any) {
        results.push({ name: buyerId, success: false, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        imported: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
