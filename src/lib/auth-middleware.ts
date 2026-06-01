import { NextRequest } from 'next/server'
import { verifyToken } from './jwt'

export interface AuthResult {
  success: boolean
  userId?: string
  tenantId?: string
  role?: string
  error?: string
  apiKeyId?: string
  effectivePermissions?: string[] // API key granular permissions mapped to backend format
}

// #48: 角色权限定义
const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: ['*'], // 所有权限
  ADMIN: ['campaigns:manage', 'contacts:manage', 'templates:manage', 'settings:manage', 'inbox:manage', 'reports:view', 'deals:manage', 'audit:view', 'billing:manage'],
  MANAGER: ['campaigns:manage', 'contacts:manage', 'templates:manage', 'inbox:manage', 'reports:view', 'deals:manage'],
  USER: ['campaigns:manage', 'contacts:manage', 'templates:manage', 'inbox:manage', 'reports:view', 'deals:manage'],
  MEMBER: ['campaigns:view', 'contacts:view', 'templates:view', 'inbox:manage'],
  VIEWER: ['campaigns:view', 'contacts:view', 'templates:view', 'reports:view'],
}

/**
 * 检查用户是否有指定权限
 * @param role - 用户角色（或 'API_KEY'）
 * @param permission - 需要检查的权限，如 'contacts:manage'
 * @param effectivePermissions - API key 的有效权限列表（已映射为后端格式），优先于角色检查
 */
export function hasPermission(role: string | undefined, permission: string, effectivePermissions?: string[]): boolean {
  // API keys: check effective permissions first
  if (effectivePermissions) {
    return effectivePermissions.includes('*') || effectivePermissions.includes(permission)
  }

  // Standard role-based check
  if (!role) return false
  const permissions = ROLE_PERMISSIONS[role] || []
  return permissions.includes('*') || permissions.includes(permission)
}

/** API Key 或 JWT 用户是否可读联系人 */
export function canReadContacts(auth: Pick<AuthResult, 'role' | 'effectivePermissions'>): boolean {
  return (
    hasPermission(auth.role, 'contacts:manage', auth.effectivePermissions) ||
    hasPermission(auth.role, 'contacts:view', auth.effectivePermissions)
  )
}

/**
 * 检查用户是否为管理员（OWNER 或 ADMIN）
 */
export function isAdmin(role: string | undefined): boolean {
  return role === 'OWNER' || role === 'ADMIN'
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
      role: payload.role,
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
 * Unified auth resolver: tries API key first, then falls back to JWT.
 * Use this in API routes that should accept both authentication methods.
 */
export async function resolveAuth(req: NextRequest): Promise<AuthResult> {
  // Try API key first (check for oh_ prefix in Bearer or x-api-key header)
  const apiKeyHeader = req.headers.get('x-api-key')
  const authHeader = req.headers.get('authorization')
  const hasApiKey = apiKeyHeader?.startsWith('oh_') || authHeader?.startsWith('Bearer oh_')

  if (hasApiKey) {
    const { verifyApiKey } = await import('./api-key')
    return verifyApiKey(req)
  }

  // Fall back to JWT
  return verifyAuthToken(req)
}

/**
 * 构建租户隔离 Prisma where 子句。
 * 无 tenantId 时返回永不匹配条件，防止全表泄露。
 * 所有租户 scoped API 必须使用，见 CLAUDE.md。
 */
export function tenantWhere(
  tenantId: string | undefined,
  baseFilter: Record<string, unknown> = {}
): Record<string, unknown> {
  if (!tenantId) {
    return { ...baseFilter, id: '__no_tenant__' }
  }
  return { ...baseFilter, tenantId }
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
