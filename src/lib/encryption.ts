import crypto from 'crypto'

/**
 * 加密配置
 * 密钥从环境变量读取，必须是 32 字节（256 位）
 */
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * 获取加密密钥
 * 必须设置 ENCRYPTION_KEY 环境变量（32 字节 hex 字符串）
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    // 开发环境回退：未配置时使用固定派生密钥（生产必须设置 ENCRYPTION_KEY）
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY environment variable is not set')
    }
    return crypto.createHash('sha256').update('outreachhub-dev-encryption-key').digest()
  }

  // Production keys must be exactly 32 bytes encoded as 64 hex characters.
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, 'hex')
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string in production')
  }

  // Preserve compatibility with existing development-only passphrases.
  return crypto.createHash('sha256').update(key).digest()
}

/**
 * 加密文本
 * @param text 要加密的文本
 * @returns 加密后的字符串（格式: iv:authTag:encryptedData，均为 hex）
 */
export function encrypt(text: string): string {
  if (!text) return ''

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // 返回格式: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * 解密文本
 * @param encryptedText 加密后的字符串（格式: iv:authTag:encryptedData）
 * @returns 解密后的原始文本
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return ''

  const key = getEncryptionKey()

  const parts = encryptedText.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format')
  }

  const [ivHex, authTagHex, encryptedData] = parts

  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * 检查文本是否已加密
 * 简单检查格式是否为 iv:authTag:data
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false
  const parts = text.split(':')
  return parts.length === 3 && parts.every(part => /^[0-9a-f]+$/.test(part))
}

/**
 * 安全地解密（如果已加密则解密，否则返回原文）
 * 用于向后兼容未加密的数据
 */
export function safeDecrypt(text: string): string {
  if (!text) return ''
  if (isEncrypted(text)) {
    try {
      return decrypt(text)
    } catch {
      // 如果解密失败，返回原文（可能是旧的明文密码）
      return text
    }
  }
  return text
}
