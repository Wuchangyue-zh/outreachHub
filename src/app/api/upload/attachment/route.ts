import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes } from '@/lib/api-errors'
import { generateFilename, validateFile, uploadFile } from '@/lib/upload'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuthToken(req)
    if (!authResult.success) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
    }
    if (!authResult.tenantId) {
      return errorResponse(ErrorCodes.FORBIDDEN, '未关联租户', 403)
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const relatedType = formData.get('relatedType') as string | null
    const relatedId = formData.get('relatedId') as string | null

    if (!file) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'No file provided', 400)
    }

    const validationError = validateFile({
      originalname: file.name,
      mimetype: file.type,
      size: file.size,
    })

    if (validationError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, validationError, 400)
    }

    const filename = generateFilename(file.name)
    const buffer = Buffer.from(await file.arrayBuffer())
    const uploaded = await uploadFile({
      folder: 'attachments',
      filename,
      buffer,
      contentType: file.type,
    })

    // 保存附件记录到数据库
    const tenantId = authResult.tenantId
    const userId = authResult.userId

    const attachment = await prisma.attachment.create({
      data: {
        tenantId,
        uploadedBy: userId || 'unknown',
        originalName: file.name,
        filename,
        url: uploaded.url,
        mimeType: file.type,
        size: file.size,
        folder: 'attachments',
        relatedType: relatedType || undefined,
        relatedId: relatedId || undefined,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: attachment.id,
        url: uploaded.url,
        filename: uploaded.filename,
        originalName: file.name,
        size: uploaded.size,
        mimeType: uploaded.mimeType,
      },
    })
  } catch (error: unknown) {
    console.error('Attachment upload error:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, '附件上传失败', 500)
  }
}
