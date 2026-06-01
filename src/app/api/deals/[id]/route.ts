import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)

    const { id } = await ctx.params
    const deal = await prisma.deal.findUnique({
      where: { id, tenantId: auth.tenantId },
      include: {
        contact: { select: { id: true, fullName: true } },
        company: { select: { id: true, name: true } },
      },
    })

    if (!deal) {
      return errorResponse(ErrorCodes.NOT_FOUND, '交易不存在', 404)
    }

    return NextResponse.json({ success: true, data: deal })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!hasPermission(auth.role, 'deals:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要商机管理权限', 403)
    }

    const { id } = await ctx.params

    // Verify ownership
    const existing = await prisma.deal.findUnique({
      where: { id, tenantId: auth.tenantId },
      select: { id: true, stage: true },
    })
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '交易不存在或无权操作', 404)
    }

    const body = await req.json()
    const { title, stage, amount, currency, expectedClose, probability, notes, contactId, companyId, ownerId, lostReason } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (amount !== undefined) updateData.amount = amount
    if (currency !== undefined) updateData.currency = currency
    if (expectedClose !== undefined) updateData.expectedClose = expectedClose ? new Date(expectedClose) : null
    if (probability !== undefined) updateData.probability = probability
    if (notes !== undefined) updateData.notes = notes
    if (contactId !== undefined) updateData.contactId = contactId
    if (companyId !== undefined) updateData.companyId = companyId
    if (ownerId !== undefined) updateData.ownerId = ownerId
    if (lostReason !== undefined) updateData.lostReason = lostReason

    // Handle stage change logic
    if (stage !== undefined && stage !== existing.stage) {
      updateData.stage = stage
      updateData.stageChangedAt = new Date()

      const isNowClosed = stage === 'WON' || stage === 'LOST'
      const wasClosed = existing.stage === 'WON' || existing.stage === 'LOST'

      if (isNowClosed) {
        // Moving to WON or LOST: set closedAt
        updateData.closedAt = new Date()
      } else if (wasClosed) {
        // Moving FROM WON/LOST back to a pipeline stage: clear closedAt
        updateData.closedAt = null
      }
    }

    const deal = await prisma.deal.update({
      where: { id, tenantId: auth.tenantId },
      data: updateData,
      include: {
        contact: { select: { id: true, fullName: true } },
        company: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: deal })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!hasPermission(auth.role, 'deals:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要商机管理权限', 403)
    }

    const { id } = await ctx.params

    // Verify ownership
    const existing = await prisma.deal.findUnique({
      where: { id, tenantId: auth.tenantId },
      select: { id: true },
    })
    if (!existing) {
      return errorResponse(ErrorCodes.NOT_FOUND, '交易不存在或无权操作', 404)
    }

    await prisma.deal.delete({ where: { id, tenantId: auth.tenantId } })
    return NextResponse.json({ success: true, message: '交易已删除' })
  } catch (error) {
    return handleApiError(error)
  }
}
