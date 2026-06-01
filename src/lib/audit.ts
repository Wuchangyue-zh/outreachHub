import { prisma } from './prisma'
import type { NextRequest } from 'next/server'

interface AuditLogInput {
  userId: string
  tenantId?: string
  action: string
  resource?: string
  resourceId?: string
  ip?: string
  userAgent?: string
  meta?: Record<string, unknown>
}

export function getAuditRequestMeta(req: NextRequest) {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  }
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        tenantId: input.tenantId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        ip: input.ip,
        userAgent: input.userAgent,
        meta: input.meta as any,
      },
    })
  } catch (error) {
    // Audit logging should never break the main flow
    console.error('[AuditLog] Failed to write:', error)
  }
}
