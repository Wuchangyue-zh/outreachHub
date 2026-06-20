import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { writeAuditLog, getAuditRequestMeta } from '@/lib/audit'

const ALLOWED_STATUSES = ['pending', 'contacted', 'converted', 'rejected']

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success || !auth.userId) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
    if (!await requirePlatformAdmin(auth.userId)) return errorResponse(ErrorCodes.FORBIDDEN, 'Forbidden', 403)

    const { id } = await ctx.params
    const existing = await prisma.demoRequest.findUnique({ where: { id } })
    if (!existing) return errorResponse(ErrorCodes.NOT_FOUND, 'Not found', 404)

    const body = await req.json()
    const updateData: any = {}

    if (body.status !== undefined) {
      if (!ALLOWED_STATUSES.includes(body.status)) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid status', 400)
      }
      updateData.status = body.status
      if (body.status === 'contacted' && !existing.contactedAt) {
        updateData.contactedAt = new Date()
      }
    }
    if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes
    if (body.contactedAt !== undefined) updateData.contactedAt = body.contactedAt ? new Date(body.contactedAt) : null

    const updated = await prisma.demoRequest.update({ where: { id }, data: updateData })

    const { ip, userAgent } = getAuditRequestMeta(req)
    await writeAuditLog({
      userId: auth.userId,
      action: 'update_demo_request',
      resource: 'DemoRequest',
      resourceId: id,
      ip, userAgent,
      meta: { status: updateData.status, internalNotes: updateData.internalNotes !== undefined },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
