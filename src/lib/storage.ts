/**
 * 统一文件存储：Vercel Blob（生产）/ public/uploads（本地开发）。
 * 禁止在新代码中直接 fs.writeFile 到 public/uploads。
 * 架构规则：见 CLAUDE.md
 */
import { promises as fs } from 'fs'
import path from 'path'
import { getStorageBackend } from './env'

export const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
export const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars')
export const ATTACHMENT_DIR = path.join(UPLOAD_DIR, 'attachments')

export interface UploadedFile {
  originalName: string
  filename: string
  path: string
  size: number
  mimeType: string
  url: string
}

export interface StorageUploadOptions {
  folder: 'avatars' | 'attachments'
  filename: string
  buffer: Buffer
  contentType: string
}

export async function ensureUploadDirs() {
  if (getStorageBackend() !== 'local') return
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
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return '文件大小不能超过 5MB'
  }

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

/**
 * 统一存储上传：优先 Vercel Blob，其次 S3 兼容，最后本地磁盘。
 */
export async function uploadFile(opts: StorageUploadOptions): Promise<UploadedFile> {
  const key = `${opts.folder}/${opts.filename}`

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob')
    const blob = await put(key, opts.buffer, {
      access: 'public',
      contentType: opts.contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    })
    return {
      originalName: opts.filename,
      filename: opts.filename,
      path: blob.pathname,
      size: opts.buffer.length,
      mimeType: opts.contentType,
      url: blob.url,
    }
  }

  await ensureUploadDirs()
  const dir = opts.folder === 'avatars' ? AVATAR_DIR : ATTACHMENT_DIR
  const filePath = path.join(dir, opts.filename)
  await fs.writeFile(filePath, opts.buffer)
  const url = `/uploads/${opts.folder}/${opts.filename}`

  return {
    originalName: opts.filename,
    filename: opts.filename,
    path: filePath,
    size: opts.buffer.length,
    mimeType: opts.contentType,
    url,
  }
}
