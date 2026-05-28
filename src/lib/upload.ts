import { promises as fs } from 'fs'
import path from 'path'

export const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
export const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars')
export const ATTACHMENT_DIR = path.join(UPLOAD_DIR, 'attachments')

export interface UploadedFile {
  originalName: string
  filename: string
  path: string
  size: number
  mimeType: string
}

export async function ensureUploadDirs() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  await fs.mkdir(AVATAR_DIR, { recursive: true })
  await fs.mkdir(ATTACHMENT_DIR, { recursive: true })
}

export function generateFilename(originalName: string): string {
  const ext = path.extname(originalName)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}${ext}`
}

export function validateFile(file: {
  originalname: string
  mimetype: string
  size: number
}): string | null {
  // Max file size: 5MB
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return '文件大小不能超过 5MB'
  }

  // Allowed MIME types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'text/plain',
  ]

  if (!allowedTypes.includes(file.mimetype)) {
    return '不支持的文件类型'
  }

  return null
}
