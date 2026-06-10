/**
 * M4c: 数据源配置状态（服务端读取 env，客户端不可见 process.env）
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

const DATA_SOURCES = [
  { name: 'RocketReach', env: 'ROCKETREACH_API_KEY', desc: '联系人搜索、公司搜索', docs: 'https://rocketreach.co/api' },
  { name: 'Apollo.io', env: 'APOLLO_API_KEY', desc: '联系人搜索、邮箱 enrichment', docs: 'https://apollo.io/api' },
  { name: 'Hunter.io', env: 'HUNTER_API_KEY', desc: '域名邮箱搜索、邮箱验证', docs: 'https://hunter.io/api' },
  { name: 'MillionVerifier', env: 'MILLION_VERIFIER_API_KEY', desc: '高精度邮箱验证（98.5%）', docs: 'https://millionverifier.com' },
  { name: 'ImportGenius (海关数据)', env: 'CUSTOMS_API_KEY', desc: '海关贸易数据搜索、买家画像', docs: 'https://www.importgenius.com/api' },
] as const

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const providers = DATA_SOURCES.map((src) => ({
      ...src,
      configured: !!process.env[src.env],
    }))

    return NextResponse.json({ success: true, data: { providers } })
  } catch (error) {
    return handleApiError(error)
  }
}
