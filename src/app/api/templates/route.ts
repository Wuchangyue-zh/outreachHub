import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || ''
    const language = searchParams.get('language') || 'en'

    const where: any = { tenantId: auth.tenantId, isActive: true, language }
    if (category) where.category = category

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: { usageCount: 'desc' },
    })

    return NextResponse.json({ success: true, data: templates })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    // #48: 创建模板需要 templates:manage 权限
    if (!hasPermission(auth.role, 'templates:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要模板管理权限', 403)
    }

    const body = await req.json()
    const template = await prisma.emailTemplate.create({
      data: { ...body, tenantId: auth.tenantId },
    })
    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    return handleApiError(error)
  }
}
