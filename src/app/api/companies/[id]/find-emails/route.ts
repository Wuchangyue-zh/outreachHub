/**
 * M2d: 公司邮箱搜索 API
 * GET /api/companies/[id]/find-emails
 * Hunter.io 域名搜索 + 邮箱格式推测
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { HunterProvider } from '@/lib/data-providers/hunter'
import { generateEmailCandidates, hasMxRecord } from '@/lib/email-guess'

type RouteContext = { params: Promise<{ id: string }> }

type EmailHit = {
  email: string
  firstName?: string
  lastName?: string
  position?: string
  confidence?: number
  source: 'hunter' | 'pattern-guess'
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const { id } = await ctx.params
    const company = await prisma.company.findFirst({
      where: { id, tenantId: auth.tenantId },
      select: {
        id: true,
        name: true,
        domain: true,
        website: true,
        contacts: {
          select: {
            firstName: true,
            lastName: true,
            fullName: true,
            emails: { select: { address: true } },
          },
        },
      },
    })

    if (!company) {
      return errorResponse(ErrorCodes.NOT_FOUND, '公司不存在', 404)
    }

    const domain = company.domain || company.website?.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!domain) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '公司无域名信息，无法搜索邮箱', 400)
    }

    const hasMx = await hasMxRecord(domain)
    if (!hasMx) {
      return NextResponse.json({
        success: true,
        data: { domain, mxValid: false, emails: [], message: '该域名无 MX 记录，可能不支持邮件接收' },
      })
    }

    const hunter = new HunterProvider()
    const seen = new Set<string>()
    const emails: EmailHit[] = []

    if (hunter.isConfigured()) {
      const hunterHits = await hunter.searchDomain(domain)
      for (const hit of hunterHits) {
        const key = hit.email.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        emails.push({
          email: hit.email,
          firstName: hit.firstName,
          lastName: hit.lastName,
          position: hit.position,
          confidence: hit.confidence,
          source: 'hunter',
        })
      }
    }

    // M2a: 基于公司联系人姓名推测邮箱格式
    for (const contact of company.contacts) {
      const hasEmail = contact.emails.some((e) => e.address)
      if (hasEmail) continue

      const firstName = contact.firstName || contact.fullName?.trim().split(/\s+/)[0] || ''
      const lastName =
        contact.lastName || contact.fullName?.trim().split(/\s+/).slice(1).join(' ') || ''
      if (!firstName || !lastName) continue

      const candidates = generateEmailCandidates(firstName, lastName, domain)
      for (const email of candidates) {
        const key = email.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        emails.push({
          email,
          firstName,
          lastName,
          confidence: 40,
          source: 'pattern-guess',
        })
      }
    }

    const hunterCount = emails.filter((e) => e.source === 'hunter').length
    const guessCount = emails.filter((e) => e.source === 'pattern-guess').length

    return NextResponse.json({
      success: true,
      data: {
        domain,
        mxValid: true,
        hunterConfigured: hunter.isConfigured(),
        emails,
        message: hunter.isConfigured()
          ? `找到 ${emails.length} 个邮箱（Hunter ${hunterCount}，格式推测 ${guessCount}）`
          : guessCount > 0
            ? `Hunter 未配置，已根据姓名推测 ${guessCount} 个候选邮箱`
            : 'Hunter.io API Key 未配置，请在 Settings 中配置',
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
