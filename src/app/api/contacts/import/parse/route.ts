import { NextRequest, NextResponse } from 'next/server'
import { parseCSV, suggestColumnMapping } from '@/lib/csv-import'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes } from '@/lib/api-errors'

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(req)
    if (!authResult.success) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, authResult.error || 'Unauthorized', 401)
    }
    if (!hasPermission(authResult.role, 'contacts:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要客户管理权限', 403)
    }

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'No file provided', 400)
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'File must be a CSV file', 400)
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'File size must be less than 10MB', 400)
    }

    // Read file content
    const content = await file.text()

    // Parse CSV
    const parseResult = parseCSV(content)

    if (parseResult.totalRows === 0) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, 'CSV file is empty', 400)
    }

    // Limit preview to first 10 rows
    const previewRows = parseResult.rows.slice(0, 10)

    // Suggest column mapping
    const suggestedMapping = suggestColumnMapping(parseResult.headers)

    return NextResponse.json({
      success: true,
      data: {
        headers: parseResult.headers,
        previewRows,
        totalRows: parseResult.totalRows,
        suggestedMapping,
      },
    })
  } catch (error: any) {
    console.error('CSV parse error:', error)
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error.message || 'Failed to parse CSV file',
      500
    )
  }
}
