/**
 * M3b: 批量邮箱验证 API
 * POST /api/contacts/verify-batch
 * body: { contactIds?: string[], emails?: string[] }
 * 验证结果写入 ContactEmail.verified + ContactEmail.verifiedAt
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { verifyBatch } from '@/lib/email-verify-pipeline'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    if (!hasPermission(auth.role, 'contacts:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足', 403)
    }

    const body = await req.json()
    const { contactIds, emails: rawEmails } = body

    let emailsToVerify: Array<{ email: string; contactEmailId?: string }> = []

    if (contactIds && Array.isArray(contactIds)) {
      // 按 contactId 获取邮箱
      const contactEmails = await prisma.contactEmail.findMany({
        where: {
          contact: {
            id: { in: contactIds },
            tenantId: auth.tenantId,
          },
        },
        select: { id: true, address: true },
      })
      emailsToVerify = contactEmails.map((ce) => ({ email: ce.address, contactEmailId: ce.id }))
    } else if (rawEmails && Array.isArray(rawEmails)) {
      emailsToVerify = rawEmails.map((e: string) => ({ email: e }))
    } else {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '请提供 contactIds 或 emails', 400)
    }

    if (emailsToVerify.length === 0) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '没有要验证的邮箱', 400)
    }

    if (emailsToVerify.length > 100) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '单次最多验证 100 个邮箱', 400)
    }

    const uniqueEmails = [...new Set(emailsToVerify.map((e) => e.email.toLowerCase().trim()))]
    const results = await verifyBatch(uniqueEmails)

    // 批量更新 ContactEmail 验证状态
    const updates: Promise<unknown>[] = []
    for (const result of results) {
      const match = emailsToVerify.find((e) => e.email.toLowerCase().trim() === result.email && e.contactEmailId)
      if (match?.contactEmailId) {
        updates.push(
          prisma.contactEmail.update({
            where: { id: match.contactEmailId },
            data: {
              isVerified: result.status === 'valid',
              verifiedAt: result.status === 'valid' ? new Date() : null,
            },
          }).catch(() => {})
        )
      }
    }
    await Promise.all(updates)

    return NextResponse.json({
      success: true,
      data: {
        total: results.length,
        valid: results.filter((r) => r.status === 'valid').length,
        invalid: results.filter((r) => r.status === 'invalid').length,
        catchAll: results.filter((r) => r.status === 'catch-all').length,
        disposable: results.filter((r) => r.status === 'disposable').length,
        unknown: results.filter((r) => r.status === 'unknown').length,
        results,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
