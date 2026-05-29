import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import * as rocketreach from '@/lib/rocketreach'
import { generateCustomerProfile } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const body = await req.json()
    const { type, params } = body

    if (type === 'search-companies') {
      const companies = await rocketreach.searchCompanies(params)
      return NextResponse.json({ success: true, data: companies })
    }

    if (type === 'search-people') {
      const people = await rocketreach.searchPeople(params)
      return NextResponse.json({ success: true, data: people })
    }

    if (type === 'company-employees') {
      const employees = await rocketreach.getCompanyEmployees(params.companyId, params)
      return NextResponse.json({ success: true, data: employees })
    }

    if (type === 'create-prospecting-task') {
      const task = await prisma.prospectingTask.create({
        data: {
          ...body.taskData,
          tenantId: auth.tenantId,
        },
      })
      return NextResponse.json({ success: true, data: task })
    }

    return errorResponse(ErrorCodes.VALIDATION_ERROR, '无效的拓客类型', 400)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || "Unauthorized", 401)

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || ''

    const skip = (page - 1) * limit
    const where: any = { tenantId: auth.tenantId }
    if (status) where.status = status

    const [tasks, total] = await Promise.all([
      prisma.prospectingTask.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.prospectingTask.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: tasks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
