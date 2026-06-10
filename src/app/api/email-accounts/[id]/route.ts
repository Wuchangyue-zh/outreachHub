import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { encrypt } from '@/lib/encryption'

type RouteContext = { params: Promise<{ id: string }> }

function sanitizeEmailAccount<T extends { smtpPassword?: string | null; imapPassword?: string | null }>(
  account: T
) {
  return {
    ...account,
    smtpPassword: account.smtpPassword ? '********' : '',
    imapPassword: account.imapPassword ? '********' : '',
  }
}

// GET /api/email-accounts/[id]
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)

    const { id } = await ctx.params
    const account = await prisma.emailAccount.findUnique({
      where: { id, userId: auth.userId },
    })
    if (!account) return errorResponse(ErrorCodes.NOT_FOUND, '邮箱账户不存在', 404)
    return NextResponse.json({ success: true, data: sanitizeEmailAccount(account) })
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/email-accounts/[id]
export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!hasPermission(auth.role, 'settings:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要邮箱设置管理权限', 403)
    }

    const { id } = await ctx.params
    const existing = await prisma.emailAccount.findUnique({
      where: { id, userId: auth.userId },
      select: { id: true },
    })
    if (!existing) return errorResponse(ErrorCodes.NOT_FOUND, '邮箱账户不存在或无权操作', 404)

    const body = await req.json()
    const updateData: Record<string, any> = {}
    if (body.email !== undefined) updateData.email = body.email
    if (body.displayName !== undefined) updateData.displayName = body.displayName
    if (body.smtpHost !== undefined) updateData.smtpHost = body.smtpHost
    if (body.smtpPort !== undefined) updateData.smtpPort = parseInt(body.smtpPort)
    if (body.smtpUser !== undefined) updateData.smtpUser = body.smtpUser
    if (body.smtpPassword !== undefined && body.smtpPassword !== '********') {
      updateData.smtpPassword = encrypt(body.smtpPassword)
    }
    if (body.imapHost !== undefined) updateData.imapHost = body.imapHost
    if (body.imapPort !== undefined) updateData.imapPort = parseInt(body.imapPort)
    if (body.imapUser !== undefined) updateData.imapUser = body.imapUser
    if (body.imapPassword !== undefined && body.imapPassword !== '********') {
      updateData.imapPassword = encrypt(body.imapPassword)
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.dailyLimit !== undefined) updateData.dailyLimit = body.dailyLimit
    // J2: Warm-up 配置
    if (body.warmupEnabled !== undefined) updateData.warmupEnabled = body.warmupEnabled
    if (body.warmupTarget !== undefined) updateData.warmupTarget = parseInt(body.warmupTarget)
    if (body.warmupEnabled === true && body.warmupDay === undefined) {
      // 启用 warmup 时自动从第 1 天开始
      const { getWarmupDailyLimit } = await import('@/lib/warmup')
      updateData.warmupDay = 1
      updateData.dailyLimit = getWarmupDailyLimit(1, body.warmupTarget || 50)
    }

    const account = await prisma.emailAccount.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json({ success: true, data: sanitizeEmailAccount(account) })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH /api/email-accounts/[id] — partial update (e.g. toggle active, reset daily)
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!hasPermission(auth.role, 'settings:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要邮箱设置管理权限', 403)
    }

    const { id } = await ctx.params
    const existing = await prisma.emailAccount.findUnique({
      where: { id, userId: auth.userId },
      select: { id: true },
    })
    if (!existing) return errorResponse(ErrorCodes.NOT_FOUND, '邮箱账户不存在或无权操作', 404)

    const body = await req.json()
    const updateData: Record<string, any> = {}
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.dailyLimit !== undefined) updateData.dailyLimit = body.dailyLimit
    if (body.dailySent !== undefined) updateData.dailySent = body.dailySent
    if (body.healthScore !== undefined) updateData.healthScore = body.healthScore
    // J2: Warm-up 配置
    if (body.warmupEnabled !== undefined) updateData.warmupEnabled = body.warmupEnabled
    if (body.warmupTarget !== undefined) updateData.warmupTarget = parseInt(body.warmupTarget)
    if (body.warmupEnabled === true && body.warmupDay === undefined) {
      const existingAccount = await prisma.emailAccount.findUnique({
        where: { id },
        select: { warmupTarget: true },
      })
      const target = body.warmupTarget !== undefined
        ? parseInt(body.warmupTarget)
        : (existingAccount?.warmupTarget ?? 50)
      const { getWarmupDailyLimit } = await import('@/lib/warmup')
      updateData.warmupDay = 1
      updateData.dailyLimit = getWarmupDailyLimit(1, target)
    }

    const account = await prisma.emailAccount.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json({ success: true, data: sanitizeEmailAccount(account) })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/email-accounts/[id]
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!hasPermission(auth.role, 'settings:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要邮箱设置管理权限', 403)
    }

    const { id } = await ctx.params
    const existing = await prisma.emailAccount.findUnique({
      where: { id, userId: auth.userId },
      select: { id: true },
    })
    if (!existing) return errorResponse(ErrorCodes.NOT_FOUND, '邮箱账户不存在或无权操作', 404)

    await prisma.emailAccount.delete({ where: { id } })
    return NextResponse.json({ success: true, message: '邮箱账户已删除' })
  } catch (error) {
    return handleApiError(error)
  }
}
