import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const { id } = await ctx.params
    const contact = await prisma.contact.findUnique({
      where: { id, tenantId: auth.tenantId },
      include: { emails: true, company: true },
    })

    if (!contact) {
      return errorResponse(ErrorCodes.NOT_FOUND, '客户不存在', 404)
    }

    return NextResponse.json({ success: true, data: contact })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)
    // #48: 编辑联系人需要 contacts:manage 权限
    if (!hasPermission(auth.role, 'contacts:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要客户管理权限', 403)
    }

    const { id } = await ctx.params

    // 验证记录归属
    const existing = await prisma.contact.findUnique({
      where: { id, tenantId: auth.tenantId },
      select: { id: true },
    })
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '客户不存在或无权操作', 404)
    }

    const body = await req.json()
    const { firstName, lastName, title, department, emails, country, city, tags, notes, status } = body

    const contact = await prisma.contact.update({
      where: { id, tenantId: auth.tenantId },
      data: {
        firstName,
        lastName,
        fullName: `${firstName || ''} ${lastName || ''}`.trim(),
        title,
        department,
        country,
        city,
        tags: tags || [],
        notes,
        status,
      },
      include: { emails: true },
    })

    if (emails && emails.length > 0) {
      await prisma.contactEmail.deleteMany({ where: { contactId: id } })
      await prisma.contactEmail.createMany({
        data: emails.map((email: string, i: number) => ({
          contactId: id,
          address: email,
          isPrimary: i === 0,
        })),
      })
    }

    return NextResponse.json({ success: true, data: contact })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)
    // #48: 删除联系人需要 contacts:manage 权限
    if (!hasPermission(auth.role, 'contacts:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要客户管理权限', 403)
    }

    const { id } = await ctx.params

    // 验证记录归属
    const existing = await prisma.contact.findUnique({
      where: { id, tenantId: auth.tenantId },
      select: { id: true },
    })
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '客户不存在或无权操作', 404)
    }

    await prisma.contactEmail.deleteMany({ where: { contactId: id } })
    await prisma.contact.delete({ where: { id, tenantId: auth.tenantId } })
    return NextResponse.json({ success: true, message: '客户已删除' })
  } catch (error) {
    return handleApiError(error)
  }
}
