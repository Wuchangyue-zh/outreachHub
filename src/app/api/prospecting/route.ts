import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
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

    const mutateTypes = ['create-prospecting-task', 'import-companies', 'import-contacts']
    if (mutateTypes.includes(type) && !hasPermission(auth.role, 'contacts:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要客户管理权限', 403)
    }

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

    // P1-8: 将 RocketReach 搜索结果入库
    if (type === 'import-companies') {
      const { companies } = body
      if (!Array.isArray(companies) || companies.length === 0) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, '请提供要导入的公司列表', 400)
      }

      const results = []
      for (const companyData of companies) {
        try {
          // 检查是否已存在（P1-9: 去重）
          const existingCompany = await prisma.company.findFirst({
            where: {
              tenantId: auth.tenantId,
              OR: [
                { domain: companyData.domain },
                { name: companyData.name },
              ].filter(condition => Object.values(condition)[0]),
            },
          })

          if (existingCompany) {
            results.push({
              success: false,
              name: companyData.name,
              error: '公司已存在',
            })
            continue
          }

          const company = await prisma.company.create({
            data: {
              tenantId: auth.tenantId,
              name: companyData.name,
              domain: companyData.domain || null,
              industry: companyData.industry || null,
              country: companyData.country || null,
              size: companyData.size || null,
              revenue: companyData.revenue || null,
              description: companyData.description || null,
              website: companyData.website || null,
              linkedinUrl: companyData.linkedinUrl || null,
              tags: companyData.tags || [],
            },
          })

          results.push({
            success: true,
            id: company.id,
            name: company.name,
          })
        } catch (error: any) {
          results.push({
            success: false,
            name: companyData.name,
            error: error.message,
          })
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          imported: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results,
        },
      })
    }

    // P1-8: 将联系人入库
    if (type === 'import-contacts') {
      const { contacts, companyId } = body
      if (!Array.isArray(contacts) || contacts.length === 0) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, '请提供要导入的联系人列表', 400)
      }

      const results = []
      for (const contactData of contacts) {
        try {
          // 检查邮箱是否已存在（P1-9: 去重）
          if (contactData.email) {
            const existingContact = await prisma.contact.findFirst({
              where: {
                tenantId: auth.tenantId,
                emails: {
                  some: {
                    address: contactData.email,
                  },
                },
              },
            })

            if (existingContact) {
              results.push({
                success: false,
                email: contactData.email,
                error: '联系人已存在',
              })
              continue
            }
          }

          const contact = await prisma.contact.create({
            data: {
              tenantId: auth.tenantId,
              fullName: contactData.fullName || `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim(),
              firstName: contactData.firstName || null,
              lastName: contactData.lastName || null,
              title: contactData.title || null,
              country: contactData.country || null,
              countryCode: contactData.countryCode || null,
              companyId: companyId || null,
              tags: contactData.tags || [],
              source: 'rocketreach',
            },
          })

          // 创建邮箱记录
          if (contactData.email) {
            await prisma.contactEmail.create({
              data: {
                contactId: contact.id,
                address: contactData.email,
                isPrimary: true,
              },
            })
          }

          results.push({
            success: true,
            id: contact.id,
            name: contact.fullName,
            email: contactData.email,
          })
        } catch (error: any) {
          results.push({
            success: false,
            email: contactData.email,
            error: error.message,
          })
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          imported: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results,
        },
      })
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
