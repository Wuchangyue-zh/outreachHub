/**
 * O1e: GET/PUT /api/campaigns/[id]/sequence
 * 管理 SEQUENCE 类型 Campaign 的序列步骤配置
 * 含版本校验（乐观锁 via updatedAt）
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * 序列步骤类型定义（与 architecture.md 文档一致）
 */
interface SequenceStepNode {
  id: string
  type: 'email' | 'wait' | 'condition'
  subject?: string
  content?: string
  htmlContent?: string
  delayHours?: number
  conditionType?: 'opened' | 'clicked' | 'replied' | 'not_opened'
  lookbackHours?: number
  branches?: { true: string; false: string }
  position?: { x: number; y: number }
}

/**
 * 校验序列步骤合法性
 */
function validateSequence(steps: unknown[]): { valid: boolean; error?: string } {
  if (!Array.isArray(steps)) return { valid: false, error: 'sequence 必须是数组' }
  if (steps.length === 0) return { valid: false, error: '序列至少需要一个步骤' }
  if (steps.length > 20) return { valid: false, error: '序列最多 20 个步骤' }

  const ids = new Set<string>()

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i] as Record<string, unknown>

    if (!step.id || typeof step.id !== 'string') {
      return { valid: false, error: `步骤 ${i + 1}: 缺少 id` }
    }
    if (ids.has(step.id)) {
      return { valid: false, error: `步骤 ${i + 1}: id "${step.id}" 重复` }
    }
    ids.add(step.id)

    const type = step.type || 'email'
    if (!['email', 'wait', 'condition'].includes(type as string)) {
      return { valid: false, error: `步骤 ${i + 1}: 无效类型 "${type}"` }
    }

    if (type === 'email') {
      if (!step.subject || typeof step.subject !== 'string' || !(step.subject as string).trim()) {
        return { valid: false, error: `步骤 ${i + 1}: email 类型需要 subject` }
      }
      if (!step.content || typeof step.content !== 'string' || !(step.content as string).trim()) {
        return { valid: false, error: `步骤 ${i + 1}: email 类型需要 content` }
      }
    }

    if (type === 'condition') {
      const validConditions = ['opened', 'clicked', 'replied', 'not_opened']
      if (!validConditions.includes(step.conditionType as string)) {
        return { valid: false, error: `步骤 ${i + 1}: 无效条件类型 "${step.conditionType}"` }
      }
      const branches = step.branches as Record<string, unknown> | undefined
      if (!branches?.true || !branches?.false) {
        return { valid: false, error: `步骤 ${i + 1}: condition 需要 branches.true 和 branches.false` }
      }
    }
  }

  return { valid: true }
}

/**
 * 兼容旧格式：将 [{subject, content, delayHours}] 转换为新格式
 */
function normalizeSequence(steps: unknown[]): SequenceStepNode[] {
  return (steps as any[]).map((step, idx) => {
    if (step.id && step.type) return step as SequenceStepNode
    // 旧格式
    return {
      id: `step-${idx + 1}`,
      type: 'email' as const,
      subject: step.subject || '',
      content: step.content || '',
      htmlContent: step.htmlContent || '',
      delayHours: step.delayHours ?? (idx === 0 ? 0 : 24),
    }
  })
}

/**
 * GET /api/campaigns/[id]/sequence
 * 返回序列配置 + 版本信息
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)

    const { id } = await ctx.params

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId: auth.tenantId },
      select: {
        id: true,
        type: true,
        sequence: true,
        status: true,
        updatedAt: true,
      },
    })

    if (!campaign) return errorResponse(ErrorCodes.NOT_FOUND, '活动不存在', 404)
    if (campaign.type !== 'SEQUENCE') {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '仅 SEQUENCE 类型活动支持序列配置', 400)
    }

    const steps = campaign.sequence ? normalizeSequence(campaign.sequence as unknown[]) : []

    return NextResponse.json({
      success: true,
      data: {
        campaignId: campaign.id,
        steps,
        status: campaign.status,
        version: campaign.updatedAt.toISOString(), // 乐观锁版本号
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PUT /api/campaigns/[id]/sequence
 * 更新序列步骤配置（含版本校验）
 * Body: { steps: SequenceStepNode[], version?: string }
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    if (!hasPermission(auth.role, 'campaigns:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要营销管理权限', 403)
    }

    const { id } = await ctx.params
    const body = await req.json()
    const { steps, version } = body as { steps: unknown[]; version?: string }

    // 校验步骤
    const validation = validateSequence(steps)
    if (!validation.valid) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, validation.error!, 400)
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId: auth.tenantId },
      select: { id: true, type: true, status: true, updatedAt: true },
    })

    if (!campaign) return errorResponse(ErrorCodes.NOT_FOUND, '活动不存在', 404)
    if (campaign.type !== 'SEQUENCE') {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '仅 SEQUENCE 类型活动支持序列配置', 400)
    }

    // 乐观锁校验
    if (version) {
      const clientVersion = new Date(version)
      if (!isNaN(clientVersion.getTime())) {
        const diff = Math.abs(campaign.updatedAt.getTime() - clientVersion.getTime())
        if (diff > 1000) { // 允许 1 秒误差
          return errorResponse(
            ErrorCodes.CONFLICT,
            '序列已被其他人修改，请刷新后重试',
            409
          )
        }
      }
    }

    // 运行中的活动不允许修改（需暂停）
    if (campaign.status === 'RUNNING') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        '运行中的活动不允许修改序列，请先暂停',
        400
      )
    }

    const normalized = normalizeSequence(steps)

    await prisma.campaign.update({
      where: { id: campaign.id, tenantId: auth.tenantId },
      data: { sequence: normalized as any },
    })

    return NextResponse.json({
      success: true,
      data: {
        campaignId: campaign.id,
        steps: normalized,
        version: new Date().toISOString(),
      },
      message: '序列配置已保存',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
