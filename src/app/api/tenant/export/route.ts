import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { writeAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!hasPermission(auth.role, 'settings:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '需要管理员权限', 403)
    }

    const tenantId = auth.tenantId
    if (!tenantId) {
      return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    }

    // Gather all tenant data in parallel
    const [tenant, users, contacts, companies, campaigns, deals, tasks] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          plan: true,
          maxUsers: true,
          maxContacts: true,
          maxEmailsPerDay: true,
          settings: true,
          createdAt: true,
        },
      }),
      prisma.user.findMany({
        where: { tenantId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.contact.findMany({
        where: { tenantId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          title: true,
          companyId: true,
          tags: true,
          createdAt: true,
          emails: {
            select: { address: true, type: true, isVerified: true },
          },
        },
      }),
      prisma.company.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          domain: true,
          website: true,
          industry: true,
          size: true,
          createdAt: true,
        },
      }),
      prisma.campaign.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          status: true,
          type: true,
          totalSent: true,
          totalOpened: true,
          totalReplied: true,
          createdAt: true,
        },
      }),
      prisma.deal.findMany({
        where: { tenantId },
        select: {
          id: true,
          title: true,
          stage: true,
          amount: true,
          currency: true,
          expectedClose: true,
          probability: true,
          notes: true,
          contactId: true,
          createdAt: true,
        },
      }),
      prisma.task.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          dueDate: true,
          createdAt: true,
        },
      }),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      tenant,
      users,
      contacts,
      companies,
      campaigns,
      deals,
      tasks,
      summary: {
        users: users.length,
        contacts: contacts.length,
        companies: companies.length,
        campaigns: campaigns.length,
        deals: deals.length,
        tasks: tasks.length,
      },
    }

    // Write audit log
    await writeAuditLog({
      userId: auth.userId!,
      tenantId,
      action: 'export_data',
      resource: 'tenant',
      resourceId: tenantId,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      meta: { summary: exportData.summary },
    })

    const json = JSON.stringify(exportData, null, 2)

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="outreachhub-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
