import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes } from '@/lib/api-errors'
import { generateFilename, validateFile, uploadFile } from '@/lib/upload'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuthToken(req)
    if (!authResult.success) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

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

    return NextResponse.json({
      success: true,
      data: {
        url: uploaded.url,
        filename: uploaded.filename,
        size: uploaded.size,
        mimeType: uploaded.mimeType,
      },
    })
  } catch (error: unknown) {
    console.error('Attachment upload error:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, '附件上传失败', 500)
  }
}
