import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { checkUserLimit } from '@/lib/plan-limits'
import { sendPlatformMail } from '@/lib/email'
import crypto from 'crypto'

/**
 * POST /api/tenant/invite
 * 邀请新成员加入团队
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    // 只有管理员可以邀请
    if (!hasPermission(auth.role, 'settings:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要设置管理权限', 403)
    }

    const body = await req.json()
    const { email, role } = body

    if (!email) {
      return errorResponse(ErrorCodes.MISSING_REQUIRED_FIELD, '请提供邀请邮箱', 400)
    }

    // 检查用户数限额
    const userLimit = await checkUserLimit(auth.tenantId)
    if (!userLimit.allowed) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        `团队成员已达上限（${userLimit.current}/${userLimit.max}），请升级套餐`,
        403
      )
    }

    // 检查是否已是团队成员
    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), tenantId: auth.tenantId },
    })
    if (existingUser) {
      return errorResponse(ErrorCodes.ALREADY_EXISTS, '该用户已是团队成员', 409)
    }

    // 检查是否已有待处理邀请
    const existingInvite = await prisma.invitation.findFirst({
      where: { email: email.toLowerCase(), tenantId: auth.tenantId, status: 'PENDING' },
    })
    if (existingInvite) {
      return errorResponse(ErrorCodes.ALREADY_EXISTS, '已向该邮箱发送过邀请', 409)
    }

    const validRoles = ['ADMIN', 'USER', 'MANAGER'] as const
    const inviteRole = validRoles.includes(role) ? role : 'USER'

    // 创建邀请
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 天有效

    const invitation = await prisma.invitation.create({
      data: {
        email: email.toLowerCase(),
        tenantId: auth.tenantId,
        role: inviteRole,
        token,
        expiresAt,
        invitedBy: auth.userId!,
      },
    })

    // 获取租户信息
    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.tenantId },
      select: { name: true },
    })

    // 获取邀请人信息
    const inviter = await prisma.user.findUnique({
      where: { id: auth.userId! },
      select: { name: true, email: true },
    })

    // 发送邀请邮件
    const inviteUrl = `${process.env.APP_URL || 'http://localhost:3030'}/accept-invite?token=${token}`
    await sendPlatformMail({
      to: email,
      subject: `邀请加入 ${tenant?.name || 'OutreachHub'} 团队`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a1a;">团队邀请</h2>
          <p style="color: #555;">
            <strong>${inviter?.name || inviter?.email}</strong> 邀请你加入 <strong>${tenant?.name || 'OutreachHub'}</strong> 团队。
          </p>
          <a href="${inviteUrl}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">
            接受邀请
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px;">此链接 7 天内有效。如果无法点击，请复制以下链接到浏览器打开：</p>
          <p style="color:#4f46e5;font-size:12px;word-break:break-all;">${inviteUrl}</p>
        </div>
      `,
    }).catch((err) => console.error('[Invite] Failed to send invite email:', err))

    return NextResponse.json({
      success: true,
      data: { id: invitation.id, email: invitation.email, expiresAt: invitation.expiresAt },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * GET /api/tenant/invite
 * 列出当前租户的待处理邀请
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    if (!hasPermission(auth.role, 'settings:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要设置管理权限', 403)
    }

    const invitations = await prisma.invitation.findMany({
      where: { tenantId: auth.tenantId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: invitations })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/tenant/invite?id=xxx
 * 撤销待处理邀请
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    if (!hasPermission(auth.role, 'settings:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要设置管理权限', 403)
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '缺少邀请 ID', 400)
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id, tenantId: auth.tenantId, status: 'PENDING' },
    })

    if (!invitation) {
      return errorResponse(ErrorCodes.NOT_FOUND, '邀请不存在或已处理', 404)
    }

    await prisma.invitation.update({
      where: { id },
      data: { status: 'REVOKED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
