import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const { id } = await ctx.params
    const company = await prisma.company.findUnique({
      where: { id, tenantId: auth.tenantId },
      include: { contacts: true },
    })

    if (!company) {
      return errorResponse(ErrorCodes.NOT_FOUND, '公司不存在', 404)
    }

    return NextResponse.json({ success: true, data: company })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const { id } = await ctx.params

    // 先验证该记录属于当前租户
    const existing = await prisma.company.findUnique({
      where: { id, tenantId: auth.tenantId },
      select: { id: true },
    })
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '公司不存在或无权操作', 404)
    }

    const body = await req.json()
    const { name, domain, website, industry, size, country, countryCode, city, linkedinUrl, description } = body

    const company = await prisma.company.update({
      where: { id },
      data: { name, domain, website, industry, size, country, countryCode, city, linkedinUrl, description },
    })

    return NextResponse.json({ success: true, data: company })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const { id } = await ctx.params

    // 先验证该记录属于当前租户
    const existing = await prisma.company.findUnique({
      where: { id, tenantId: auth.tenantId },
      select: { id: true },
    })
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '公司不存在或无权操作', 404)
    }

    const contactsCount = await prisma.contact.count({ where: { companyId: id } })

    if (contactsCount > 0) {
      return NextResponse.json(
        { error: `该公司有 ${contactsCount} 个关联客户，请先删除或转移客户` },
        { status: 400 }
      )
    }

    await prisma.company.delete({ where: { id } })
    return NextResponse.json({ success: true, message: '公司已删除' })
  } catch (error) {
    return handleApiError(error)
  }
}
