import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

/**
 * GET /api/stats/team
 *
 * 团队绩效统计。按用户聚合 Deal 胜单数、胜单金额、总 Deal 数和联系人领取数。
 * 查询参数：period（天数，默认 30）
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const { searchParams } = new URL(req.url)
    const period = parseInt(searchParams.get('period') || '30', 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)

    // 获取租户下所有用户
    const users = await prisma.user.findMany({
      where: { tenantId: auth.tenantId },
      select: { id: true, name: true, email: true, avatar: true },
    })

    // 为每个用户聚合绩效数据
    const userStats = await Promise.all(
      users.map(async (user) => {
        const [dealsWon, dealsWonAmount, totalDeals, contactsClaimed] = await Promise.all([
          // 胜单数
          prisma.deal.count({
            where: {
              ownerId: user.id,
              stage: 'WON',
              closedAt: { gte: startDate },
            },
          }),
          // 胜单金额
          prisma.deal.aggregate({
            where: {
              ownerId: user.id,
              stage: 'WON',
              closedAt: { gte: startDate },
            },
            _sum: { amount: true },
          }),
          // 期间内新建 Deal 总数
          prisma.deal.count({
            where: {
              ownerId: user.id,
              createdAt: { gte: startDate },
            },
          }),
          // 领取的联系人数
          prisma.contact.count({
            where: {
              ownerId: user.id,
              claimedAt: { gte: startDate },
            },
          }),
        ])

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          dealsWon,
          dealsWonAmount: dealsWonAmount._sum.amount || 0,
          totalDeals,
          contactsClaimed,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        users: userStats,
        period,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
