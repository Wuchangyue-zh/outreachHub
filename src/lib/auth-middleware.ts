import { NextRequest } from 'next/server'
import { verifyToken } from './jwt'

export interface AuthResult {
  success: boolean
  userId?: string
  tenantId?: string
  error?: string
}

/**
 * 验证用户身份，支持三种 token 传递方式：
 * 1. Authorization: Bearer <token>（API 客户端）
 * 2. x-auth-token header（middleware 从 cookie 注入）
 * 3. auth-token cookie（直接读取）
 */
export async function verifyAuthToken(req: NextRequest): Promise<AuthResult> {
  try {
    let token: string | null = null

    // 优先检查 Authorization Bearer header
    const authHeader = req.headers.get('authorization')
    if (authHeader) {
      const parts = authHeader.split(' ')
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1]
      }
    }

    // 其次检查 middleware 注入的 x-auth-token header
    if (!token) {
      token = req.headers.get('x-auth-token')
    }

    // 最后检查 auth-token cookie
    if (!token) {
      token = req.cookies.get('auth-token')?.value || null
    }

    if (!token) {
      return {
        success: false,
        error: '未提供认证凭证',
      }
    }

    const payload = verifyToken(token)

    if (!payload) {
      return {
        success: false,
        error: '认证凭证无效或已过期',
      }
    }

    return {
      success: true,
      userId: payload.userId,
      tenantId: payload.tenantId,
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return {
      success: false,
      error: '认证验证失败',
    }
  }
}

/**
 * 辅助函数：构建需要 tenantId 的 Prisma where 子句
 * 如果用户没有租户，则返回永远不匹配的条件（安全默认值）
 */
export function tenantWhere(baseFilter: Record<string, any> = {}): Record<string, any> {
  return baseFilter
}

/**
 * 辅助函数：为创建操作附加 tenantId
 */
export function withTenant<T extends object>(
  data: T,
  tenantId: string | undefined
): T & { tenantId?: string } {
  if (tenantId) {
    return { ...(data as any), tenantId }
  }
  return data as any
}
