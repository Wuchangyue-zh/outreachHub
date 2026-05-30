/**
 * 附件管理 API
 * GET    — 列出当前租户附件（支持 relatedType/relatedId 筛选）
 * DELETE — 删除指定附件（DB 记录 + 存储文件）
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken, isAdmin } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes } from '@/lib/api-errors'
import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuthToken(req)
    if (!authResult.success) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
    }

    const tenantId = authResult.tenantId
    if (!tenantId) {
      return errorResponse(ErrorCodes.FORBIDDEN, '未关联租户', 403)
    }

    const { searchParams } = new URL(req.url)
    const relatedType = searchParams.get('relatedType')
    const relatedId = searchParams.get('relatedId')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

    const where: Record<string, unknown> = { tenantId }
    if (relatedType) where.relatedType = relatedType
    if (relatedId) where.relatedId = relatedId

    const [attachments, total] = await Promise.all([
      prisma.attachment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.attachment.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: attachments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error: unknown) {
    console.error('Attachments list error:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, '获取附件列表失败', 500)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authResult = await verifyAuthToken(req)
    if (!authResult.success) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
    }

    // 仅上传者本人或管理员可删除
    const userId = authResult.userId

    const tenantId = authResult.tenantId
    if (!tenantId) {
      return errorResponse(ErrorCodes.FORBIDDEN, '未关联租户', 403)
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '缺少附件 ID', 400)
    }

    const attachment = await prisma.attachment.findFirst({
      where: { id, tenantId },
    })

    if (!attachment) {
      return errorResponse(ErrorCodes.NOT_FOUND, '附件不存在', 404)
    }

    if (attachment.uploadedBy !== userId && !isAdmin(authResult.role)) {
      return errorResponse(ErrorCodes.FORBIDDEN, '无权删除此附件', 403)
    }

    // 删除存储文件
    await deleteFile({
      folder: attachment.folder,
      filename: attachment.filename,
      url: attachment.url,
    }).catch((err) => {
      console.warn('Failed to delete file from storage:', err)
    })

    // 删除 DB 记录
    await prisma.attachment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Attachment delete error:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, '删除附件失败', 500)
  }
}
