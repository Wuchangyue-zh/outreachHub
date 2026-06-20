import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission, tenantWhere } from '@/lib/auth-middleware'
import { areValidApiKeyPermissions, generateApiKey } from '@/lib/api-key'
import { isProOrAbove, planUpgradeRequiredResponse } from '@/lib/plan-limits'

/**
 * GET /api/api-keys — List all API keys for the current tenant.
 * Only returns keyPrefix (never the full key).
 * Requires PRO or ENTERPRISE plan.
 */
export async function GET(req: NextRequest) {
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

  const keys = await prisma.apiKey.findMany({
    where: tenantWhere(auth.tenantId),
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
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    success: true,
    data: keys.map((key) => ({
      ...key,
      status: key.isActive ? 'active' : 'revoked',
    })),
  })
}

/**
 * POST /api/api-keys — Create a new API key.
 * Returns the full raw key ONCE. It is never stored or shown again.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAuthToken(req)
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  if (!hasPermission(auth.role, 'settings:manage')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  if (!auth.tenantId) {
    return NextResponse.json({ error: 'Tenant required' }, { status: 403 })
  }

  if (!(await isProOrAbove(auth.tenantId))) {
    return planUpgradeRequiredResponse('API Keys')
  }

  try {
    const body = await req.json()
    const { name, permissions, rateLimit, expiresAt } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (permissions !== undefined && !areValidApiKeyPermissions(permissions)) {
      return NextResponse.json({ error: 'Invalid API key permissions' }, { status: 400 })
    }
    if (rateLimit !== undefined && (!Number.isInteger(rateLimit) || rateLimit < 1 || rateLimit > 10000)) {
      return NextResponse.json({ error: 'rateLimit must be an integer between 1 and 10000' }, { status: 400 })
    }

    const expiry = expiresAt ? new Date(expiresAt) : null
    if (expiry && (Number.isNaN(expiry.getTime()) || expiry <= new Date())) {
      return NextResponse.json({ error: 'expiresAt must be a future date' }, { status: 400 })
    }

    const { raw, hash, prefix } = generateApiKey()

    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId: auth.tenantId,
        userId: auth.userId!,
        name: name.trim(),
        keyPrefix: prefix,
        keyHash: hash,
        permissions: permissions || [],
        rateLimit: rateLimit || 100,
        expiresAt: expiry,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        key: raw,
        metadata: apiKey,
      },
      warning: 'Save this key now. It will not be shown again.',
    }, { status: 201 })
  } catch (error) {
    console.error('Create API key error:', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}
