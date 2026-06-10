/**
 * 统一文件存储：Vercel Blob（生产）/ S3 兼容（Cloudflare R2 等）/ public/uploads（本地开发）。
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
  const maxSize = 10 * 1024 * 1024 // 10MB（含附件场景）
  if (file.size > maxSize) {
    return '文件大小不能超过 10MB'
  }

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/html',
  ]

  if (!allowedTypes.includes(file.mimetype)) {
    return '不支持的文件类型'
  }

  return null
}

// ==================== S3 兼容存储 ====================

function getS3Config() {
  return {
    endpoint: process.env.S3_ENDPOINT,           // Cloudflare R2 / MinIO / AWS S3
    region: process.env.S3_REGION || 'auto',
    bucket: process.env.S3_BUCKET!,
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
    publicUrl: process.env.S3_PUBLIC_URL,         // 自定义域名，如 https://cdn.example.com
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true', // MinIO 等需要
  }
}

/**
 * 获取 S3 公开访问 URL
 */
function getS3PublicUrl(key: string): string {
  const cfg = getS3Config()
  if (cfg.publicUrl) {
    return `${cfg.publicUrl.replace(/\/$/, '')}/${key}`
  }
  // 默认：虚拟主机风格
  return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`
}

/**
 * S3 上传（兼容 Cloudflare R2 / MinIO / AWS S3）
 */
async function uploadToS3(key: string, buffer: Buffer, contentType: string): Promise<string> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  const cfg = getS3Config()

  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  })

  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  )

  return getS3PublicUrl(key)
}

/**
 * 删除 S3 对象
 */
export async function deleteFromS3(key: string): Promise<void> {
  const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3')
  const cfg = getS3Config()

  const client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  })

  await client.send(
    new DeleteObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
    })
  )
}

// ==================== 统一存储接口 ====================

/**
 * 统一存储上传：优先 Vercel Blob，其次 S3 兼容，最后本地磁盘。
 */
export async function uploadFile(opts: StorageUploadOptions): Promise<UploadedFile> {
  const key = `${opts.folder}/${opts.filename}`
  const backend = getStorageBackend()

  // 1. Vercel Blob
  if (backend === 'blob') {
    const { put } = await import('@vercel/blob')
    const blob = await put(key, opts.buffer, {
      access: 'public',
      contentType: opts.contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN!,
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

  // 2. S3 兼容（Cloudflare R2 / MinIO / AWS S3）
  if (backend === 's3') {
    const url = await uploadToS3(key, opts.buffer, opts.contentType)
    return {
      originalName: opts.filename,
      filename: opts.filename,
      path: key,
      size: opts.buffer.length,
      mimeType: opts.contentType,
      url,
    }
  }

  // 3. 本地磁盘
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

/**
 * 删除文件（统一接口）
 * @param opts.url Blob 后端必填（Vercel Blob del 需要完整 URL）
 */
export async function deleteFile(opts: { folder: string; filename: string; url?: string }): Promise<void> {
  const key = `${opts.folder}/${opts.filename}`
  const backend = getStorageBackend()

  if (backend === 'blob') {
    if (!opts.url) {
      console.warn('[deleteFile] Blob 后端删除需要 url 参数，已跳过')
      return
    }
    const { del } = await import('@vercel/blob')
    await del(opts.url, { token: process.env.BLOB_READ_WRITE_TOKEN! })
    return
  }

  if (backend === 's3') {
    await deleteFromS3(key)
    return
  }

  // 本地磁盘
  const filePath = path.join(UPLOAD_DIR, opts.folder, opts.filename)
  await fs.unlink(filePath).catch(() => {})
}

/**
 * 根据 URL 获取文件 Buffer（用于邮件附件）
 * 本地路径直接读磁盘；远程 URL 用 fetch 下载
 */
export async function fetchFileBuffer(url: string): Promise<{ buffer: Buffer; filename: string }> {
  const filename = path.basename(url)

  // 本地磁盘路径（/uploads/...）
  if (url.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), 'public', url)
    const buffer = await fs.readFile(filePath)
    return { buffer, filename }
  }

  // 远程 URL（Blob / S3）
  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(`Failed to fetch file: ${resp.status} ${resp.statusText}`)
  }
  const arrayBuf = await resp.arrayBuffer()
  return { buffer: Buffer.from(arrayBuf), filename }
}

/**
 * 将本地相对路径转为公网可访问 URL（H2: 邮件 HTML 图片公网化）
 * - /uploads/... → APP_URL + /uploads/...（仅当有 APP_URL 时）
 * - 已是 http(s) 开头 → 原样返回
 */
export function resolvePublicUrl(urlPath: string): string {
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) {
    return urlPath
  }
  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '')
  if (!appUrl) return urlPath
  return `${appUrl}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`
}
