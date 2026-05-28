import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes } from '@/lib/api-errors'
import { ensureUploadDirs, generateFilename, validateFile, AVATAR_DIR } from '@/lib/upload'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuthToken(req)
    if (!authResult.success) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
    }

    await ensureUploadDirs()

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'No file provided', 400)
    }

    // Validate
    const validationError = validateFile({
      originalname: file.name,
      mimetype: file.type,
      size: file.size,
    })

    if (validationError) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, validationError, 400)
    }

    // Only allow images for avatars
    if (!file.type.startsWith('image/')) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '头像必须是图片文件', 400)
    }

    // Generate filename and save
    const filename = generateFilename(file.name)
    const filePath = path.join(AVATAR_DIR, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filePath, buffer)

    // Return URL
    const url = `/uploads/avatars/${filename}`

    return NextResponse.json({
      success: true,
      data: {
        url,
        filename,
        size: file.size,
      },
    })
  } catch (error: any) {
    console.error('Avatar upload error:', error)
    return errorResponse(ErrorCodes.INTERNAL_ERROR, '头像上传失败', 500)
  }
}
