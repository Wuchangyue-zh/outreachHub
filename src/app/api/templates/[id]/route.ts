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
    const template = await prisma.emailTemplate.findUnique({
      where: { id, tenantId: auth.tenantId },
    })

    if (!template) {
      return errorResponse(ErrorCodes.NOT_FOUND, '模板不存在', 404)
    }

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const { id } = await ctx.params

    // 验证记录归属
    const existing = await prisma.emailTemplate.findUnique({
      where: { id, tenantId: auth.tenantId },
      select: { id: true },
    })
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '模板不存在或无权操作', 404)
    }

    const body = await req.json()
    const { name, subject, content, category, language, variables } = body

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: { name, subject, content, category, language, variables: variables || [] },
    })

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const { id } = await ctx.params

    // 验证记录归属
    const existing = await prisma.emailTemplate.findUnique({
      where: { id, tenantId: auth.tenantId },
      select: { id: true },
    })
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '模板不存在或无权操作', 404)
    }

    await prisma.emailTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true, message: '模板已删除' })
  } catch (error) {
    return handleApiError(error)
  }
}
