import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAuth, hasPermission, tenantWhere, canReadContacts } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { rateLimit, checkApiKeyRateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await resolveAuth(req)
  if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
  if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '需要租户关联', 403)
  if (!canReadContacts(auth)) return errorResponse(ErrorCodes.FORBIDDEN, '权限不足', 403)

  // Per-key rate limit for API key auth, global for JWT
  const keyLimit = auth.apiKeyId && auth.apiKeyRateLimit
    ? await checkApiKeyRateLimit(req, auth.apiKeyId, auth.apiKeyRateLimit)
    : await limiter.check(req, 30)
  if (keyLimit) return keyLimit

  try {
    const { id } = await ctx.params
    const contact = await prisma.contact.findFirst({
      where: { id, ...tenantWhere(auth.tenantId) },
      include: { emails: true, company: { select: { id: true, name: true } } },
    })

    if (!contact) {
      return errorResponse(ErrorCodes.NOT_FOUND, '联系人不存在', 404)
    }

    return NextResponse.json({ success: true, data: contact })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const auth = await resolveAuth(req)
  if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
  if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '需要租户关联', 403)
  if (!hasPermission(auth.role, 'contacts:manage', auth.effectivePermissions)) {
    return errorResponse(ErrorCodes.FORBIDDEN, '权限不足', 403)
  }

  // Per-key rate limit for API key auth, global for JWT
  const keyLimit = auth.apiKeyId && auth.apiKeyRateLimit
    ? await checkApiKeyRateLimit(req, auth.apiKeyId, auth.apiKeyRateLimit)
    : await limiter.check(req, 10)
  if (keyLimit) return keyLimit

  try {
    const { id } = await ctx.params
    const existing = await prisma.contact.findFirst({
      where: { id, ...tenantWhere(auth.tenantId) },
      select: { id: true },
    })
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '联系人不存在', 404)
    }

    const body = await req.json()
    const { fullName, firstName, lastName, title, companyId, emails, tags, notes, status } = body

    const contact = await prisma.contact.update({
      where: { id, tenantId: auth.tenantId },
      data: {
        fullName: fullName || (firstName || lastName ? `${firstName || ''} ${lastName || ''}`.trim() : undefined),
        firstName,
        lastName,
        title,
        companyId,
        tags: tags ?? undefined,
        notes,
        status,
      },
      include: { emails: true, company: { select: { id: true, name: true } } },
    })

    if (Array.isArray(emails)) {
      // 通过关系过滤确保租户隔离（ContactEmail 无 tenantId 字段）
      await prisma.contactEmail.deleteMany({ where: { contact: { id, tenantId: auth.tenantId } } })
      if (emails.length > 0) {
        await prisma.contactEmail.createMany({
          data: emails.map((email: string, i: number) => ({
            contactId: id,
            address: email,
            isPrimary: i === 0,
          })),
        })
      }
    }

    const fullContact = await prisma.contact.findUnique({
      where: { id },
      include: { emails: true, company: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ success: true, data: fullContact })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const auth = await resolveAuth(req)
  if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
  if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '需要租户关联', 403)
  if (!hasPermission(auth.role, 'contacts:manage', auth.effectivePermissions)) {
    return errorResponse(ErrorCodes.FORBIDDEN, '权限不足', 403)
  }

  // Per-key rate limit for API key auth, global for JWT
  const keyLimit = auth.apiKeyId && auth.apiKeyRateLimit
    ? await checkApiKeyRateLimit(req, auth.apiKeyId, auth.apiKeyRateLimit)
    : await limiter.check(req, 10)
  if (keyLimit) return keyLimit

  try {
    const { id } = await ctx.params
    const existing = await prisma.contact.findFirst({
      where: { id, ...tenantWhere(auth.tenantId) },
      select: { id: true },
    })
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '联系人不存在', 404)
    }

    // 通过关系过滤确保租户隔离（关联表无 tenantId 字段）
    await prisma.contactEmail.deleteMany({ where: { contact: { id, tenantId: auth.tenantId } } })
    await prisma.emailLog.deleteMany({ where: { contact: { id, tenantId: auth.tenantId } } })
    await prisma.campaignContact.deleteMany({ where: { contact: { id, tenantId: auth.tenantId } } })
    await prisma.contact.delete({ where: { id, tenantId: auth.tenantId } })

    return NextResponse.json({ success: true, data: { deleted: true } })
  } catch (error) {
    return handleApiError(error)
  }
}
