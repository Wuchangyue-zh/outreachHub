import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission, tenantWhere } from '@/lib/auth-middleware'
import { isProOrAbove, planUpgradeRequiredResponse } from '@/lib/plan-limits'
import { areValidApiKeyPermissions } from '@/lib/api-key'

/**
 * PATCH /api/api-keys/:id — Update an API key (name, permissions, rateLimit, isActive).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuthToken(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  if (!hasPermission(auth.role, 'settings:manage')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  if (!auth.tenantId || !(await isProOrAbove(auth.tenantId))) {
    return planUpgradeRequiredResponse('API Keys')
  }

  const { id } = await params

  // Verify the key belongs to the tenant
  const existing = await prisma.apiKey.findFirst({
    where: { id, ...tenantWhere(auth.tenantId) },
  })

  if (!existing) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const { name, permissions, rateLimit, isActive } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      data.name = name.trim()
    }
    if (permissions !== undefined) {
      if (!areValidApiKeyPermissions(permissions)) {
        return NextResponse.json({ error: 'Invalid API key permissions' }, { status: 400 })
      }
      data.permissions = permissions
    }
    if (rateLimit !== undefined) {
      if (!Number.isInteger(rateLimit) || rateLimit < 1 || rateLimit > 10000) {
        return NextResponse.json({ error: 'rateLimit must be an integer between 1 and 10000' }, { status: 400 })
      }
      data.rateLimit = rateLimit
    }
    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 })
      }
      data.isActive = isActive
    }

    const updated = await prisma.apiKey.update({
      where: { id, tenantId: auth.tenantId! },
      data,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ key: updated })
  } catch (error) {
    console.error('Update API key error:', error)
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 })
  }
}

/**
 * DELETE /api/api-keys/:id — Revoke (soft-delete) an API key.
 * Sets isActive to false rather than deleting the record.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuthToken(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  if (!hasPermission(auth.role, 'settings:manage')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  if (!auth.tenantId || !(await isProOrAbove(auth.tenantId))) {
    return planUpgradeRequiredResponse('API Keys')
  }

  const { id } = await params

  // Verify the key belongs to the tenant
  const existing = await prisma.apiKey.findFirst({
    where: { id, ...tenantWhere(auth.tenantId) },
  })

  if (!existing) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 })
  }

  try {
    await prisma.apiKey.update({
      where: { id, tenantId: auth.tenantId! },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: { revoked: true }, message: 'API key revoked' })
  } catch (error) {
    console.error('Revoke API key error:', error)
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
  }
}
