/**
 * J1: 发信域名 DNS 记录建议
 * GET /api/email-accounts/[id]/dns-records
 * 返回 SPF / DKIM / DMARC 建议 DNS 记录（基于 EmailAccount 域名）
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

type RouteContext = { params: Promise<{ id: string }> }

interface DnsRecord {
  type: 'TXT' | 'CNAME' | 'MX'
  host: string
  value: string
  priority?: number
  description: string
  status: 'required' | 'recommended' | 'optional'
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const { id } = await ctx.params
    const account = await prisma.emailAccount.findFirst({
      where: { id, user: { tenantId: auth.tenantId } },
      select: { id: true, email: true, smtpHost: true },
    })

    if (!account) {
      return errorResponse(ErrorCodes.NOT_FOUND, '邮箱账户不存在', 404)
    }

    const domain = account.email.split('@')[1]
    if (!domain) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '无法从邮箱地址解析域名', 400)
    }

    // 推断 SMTP 发送域名（通常与邮箱域名一致）
    const sendDomain = domain

    const records: DnsRecord[] = [
      {
        type: 'TXT',
        host: sendDomain,
        value: `v=spf1 include:${getSpfInclude(account.smtpHost)} ~all`,
        description: 'SPF 记录：授权哪些服务器可以代表您的域名发送邮件',
        status: 'required',
      },
      {
        type: 'TXT',
        host: `default._domainkey.${sendDomain}`,
        value: `v=DKIM1; k=rsa; p=<YOUR_DKIM_PUBLIC_KEY>`,
        description: 'DKIM 记录：对邮件进行数字签名，防止篡改。需从邮件服务商获取公钥。',
        status: 'required',
      },
      {
        type: 'TXT',
        host: `_dmarc.${sendDomain}`,
        value: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${sendDomain}; pct=100`,
        description: 'DMARC 记录：告诉收件服务器如何处理 SPF/DKIM 验证失败的邮件',
        status: 'recommended',
      },
      {
        type: 'TXT',
        host: `_mta-sts.${sendDomain}`,
        value: `v=STSv1; id=${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        description: 'MTA-STS：强制 TLS 加密传输（勿与根域名 SPF TXT 混在同一 host）',
        status: 'optional',
      },
      {
        type: 'CNAME',
        host: `_mta-sts.${sendDomain}`,
        value: `mta-sts.${sendDomain}`,
        description: 'MTA-STS 策略主机',
        status: 'optional',
      },
    ]

    return NextResponse.json({
      success: true,
      data: {
        domain: sendDomain,
        records,
        tips: [
          'DNS 记录生效通常需要 24-48 小时',
          'SPF 记录每个域名只能有一条，多条需要合并',
          'DKIM 公钥需从您的邮件服务商（如 Google Workspace、腾讯企业邮）获取',
          '建议先配置 SPF 和 DKIM，观察 1 周送达率后再启用 DMARC p=reject',
          '使用 https://www.mail-tester.com 测试邮件送达评分',
        ],
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * 根据 SMTP Host 推断 SPF include 域名
 */
function getSmtpHost(smtpHost: string): string {
  const host = smtpHost.toLowerCase()
  if (host.includes('gmail') || host.includes('google')) return '_spf.google.com'
  if (host.includes('outlook') || host.includes('hotmail') || host.includes('microsoft')) return 'spf.protection.outlook.com'
  if (host.includes('qq') || host.includes('exmail')) return 'spf.mail.qq.com'
  if (host.includes('163') || host.includes('netease')) return 'spf.163.com'
  if (host.includes('aliyun') || host.includes('alibaba')) return 'spf.aliyun.com'
  if (host.includes('yahoo')) return 'spf.mail.yahoo.com'
  if (host.includes('zoho')) return 'spf.zoho.com'
  if (host.includes('sendgrid')) return 'spf.sendgrid.net'
  if (host.includes('mailgun')) return 'spf.mailgun.org'
  if (host.includes('amazonses') || host.includes('aws')) return 'spf.amazonses.com'
  // 通用：使用 SMTP Host 的根域名
  const parts = host.split('.')
  return parts.length >= 2 ? `mx.${parts.slice(-2).join('.')}` : host
}

function getSpfInclude(smtpHost: string): string {
  return getSmtpHost(smtpHost)
}
