import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

// GET /api/users/me — get current user profile
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, name: true, avatar: true, role: true, createdAt: true },
    })
    if (!user) return errorResponse(ErrorCodes.NOT_FOUND, '用户不存在', 404)
    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/users/me — update current user profile
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)

    const body = await req.json()
    const updateData: Record<string, any> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.avatar !== undefined) updateData.avatar = body.avatar

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: { id: true, email: true, name: true, avatar: true, role: true },
    })
    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    return handleApiError(error)
  }
}
