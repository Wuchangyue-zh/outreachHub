import { NextRequest, NextResponse } from 'next/server'
import { parseCSV, importContacts } from '@/lib/csv-import'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes } from '@/lib/api-errors'
import { checkContactLimit } from '@/lib/plan-limits'
import { checkTrialStatus } from '@/lib/trial-guard'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

export async function POST(req: NextRequest) {
  const rateLimitResult = await limiter.check(req, 10)
  if (rateLimitResult) return rateLimitResult
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(req)
    if (!authResult.success || !authResult.userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, authResult.error || 'Unauthorized', 401)
    }
    if (!hasPermission(authResult.role, 'contacts:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要客户管理权限', 403)
    }
    if (!authResult.tenantId) {
      return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    }

    const trial = await checkTrialStatus(authResult.tenantId)
    if (!trial.allowed) {
      return errorResponse(ErrorCodes.FORBIDDEN,
        '试用期已结束，请升级套餐以继续使用。访问 /pricing 查看套餐方案。', 403)
    }

    // Parse request body
    const body = await req.json()
    const { csvContent, mapping } = body

    if (!csvContent) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'CSV content is required', 400)
    }

    if (!mapping || typeof mapping !== 'object') {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'Column mapping is required', 400)
    }

    // Parse CSV
    const parseResult = parseCSV(csvContent)

    if (parseResult.totalRows === 0) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'CSV file is empty', 400)
    }

    // H3b: 检查联系人限额（含本次导入量）
    const limitCheck = await checkContactLimit(authResult.tenantId)
    const remaining = limitCheck.max - limitCheck.current
    if (remaining <= 0) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        `联系人已达上限（${limitCheck.current}/${limitCheck.max}），请升级套餐或删除部分联系人`,
        403
      )
    }
    if (parseResult.totalRows > remaining) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        `导入 ${parseResult.totalRows} 条将超过剩余配额（还可导入 ${remaining} 条）`,
        403
      )
    }

    // Import contacts
    const importResult = await importContacts(
      parseResult.rows,
      mapping,
      authResult.tenantId
    )

    return NextResponse.json({
      success: true,
      data: importResult,
    })
  } catch (error: any) {
    console.error('CSV import error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error.message || 'Failed to import contacts',
      500
    )
  }
}
