import { NextRequest, NextResponse } from 'next/server'
import { parseCSV, importContacts } from '@/lib/csv-import'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes } from '@/lib/api-errors'

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(req)
    if (!authResult.success || !authResult.userId) {
      return errorResponse(ErrorCodes.UNAUTHORIZED, authResult.error || 'Unauthorized', 401)
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

    // Import contacts
    const importResult = await importContacts(
      parseResult.rows,
      mapping,
      authResult.userId
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
