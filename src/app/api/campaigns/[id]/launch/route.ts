import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken, hasPermission } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { addBulkEmailJobs, addEmailJob } from '@/lib/email-queue'
import { applyEmailVariables, buildContactVariables } from '@/lib/email-variables'
import { getAvailableAccount } from '@/lib/select-email-account'
import { checkDailyEmailLimit } from '@/lib/plan-limits'
import { getCampaignContactIds } from '@/lib/campaign-contacts'
import { getCampaignAttachmentIds } from '@/lib/campaign-attachments'
import { getStorageBackend } from '@/lib/env'
import { checkTrialStatus } from '@/lib/trial-guard'
import { writeAuditLog, getAuditRequestMeta } from '@/lib/audit'

type RouteContext = { params: Promise<{ id: string }> }

async function auditCampaignLaunch(
  req: NextRequest,
  auth: { userId?: string; tenantId?: string | null },
  campaignId: string,
  meta?: Record<string, unknown>
) {
  if (!auth.userId) return
  await writeAuditLog({
    userId: auth.userId,
    tenantId: auth.tenantId || undefined,
    action: 'launch_campaign',
    resource: 'campaign',
    resourceId: campaignId,
    ...getAuditRequestMeta(req),
    meta,
  })
}

function getLaunchWarnings(): string[] {
  const appUrl = process.env.APP_URL || ''
  if (!appUrl || appUrl.includes('localhost')) {
    const msg = `APP_URL 未配置或为 localhost（当前: ${appUrl || '未设置'}），邮件追踪链接和内嵌图片可能无法被收件方访问。`
    console.warn(`[Launch] ${msg}`)
    return [msg]
  }
  return []
}

/**
 * POST /api/campaigns/[id]/launch
 *
 * Transitions campaign to RUNNING and enqueues emails for contacts.
 * Skips contacts already sent for this campaign (safe resume from PAUSED).
 * Supports SINGLE (immediate blast) and SEQUENCE (step-by-step with delays).
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.tenantId) return errorResponse(ErrorCodes.FORBIDDEN, '用户未关联租户', 403)
    // #48: 启动活动需要 campaigns:manage 权限
    if (!hasPermission(auth.role, 'campaigns:manage')) {
      return errorResponse(ErrorCodes.FORBIDDEN, '权限不足：需要营销管理权限', 403)
    }

    // R2b: 试用期过期检查
    const trial = await checkTrialStatus(auth.tenantId!)
    if (!trial.allowed) {
      return errorResponse(ErrorCodes.FORBIDDEN,
        '试用期已结束，请升级套餐以继续使用。访问 /pricing 查看套餐方案。', 403)
    }

    const { id } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const { scheduledAt } = body

    const campaign = await prisma.campaign.findUnique({
      where: { id, tenantId: auth.tenantId },
    })
    if (!campaign) return errorResponse(ErrorCodes.NOT_FOUND, '活动不存在或无权操作', 404)

    if (!['DRAFT', 'PAUSED', 'SCHEDULED'].includes(campaign.status)) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, `无法从 ${campaign.status} 状态启动`, 400)
    }

    const campaignContactIds = await getCampaignContactIds(campaign.id)
    if (!campaignContactIds.length) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '请先为该活动添加目标联系人', 400)
    }

    // P1-6: 如果提供了 scheduledAt，设置为定时任务
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt)
      if (isNaN(scheduledDate.getTime())) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, '无效的定时时间', 400)
      }

      if (scheduledDate <= new Date()) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, '定时时间必须在未来', 400)
      }

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          status: 'SCHEDULED',
          scheduledAt: scheduledDate,
        },
      })

      await auditCampaignLaunch(req, auth, campaign.id, { status: 'SCHEDULED', scheduledAt: scheduledDate.toISOString() })

      return NextResponse.json({
        success: true,
        data: {
          campaignId: campaign.id,
          status: 'SCHEDULED',
          scheduledAt: scheduledDate.toISOString(),
          message: `活动将在 ${scheduledDate.toLocaleString('zh-CN')} 自动启动`,
        },
      })
    }

    // 立即启动
    const launchWarnings = getLaunchWarnings()

    // O2c: 同联系人多 Campaign 冲突检测
    const conflictingCampaigns = await prisma.campaign.findMany({
      where: {
        tenantId: auth.tenantId,
        status: 'RUNNING',
        id: { not: campaign.id },
        campaignContacts: {
          some: {
            contactId: { in: campaignContactIds },
            status: { in: ['PENDING', 'SENT'] },
          },
        },
      },
      select: { id: true, name: true, type: true },
    })

    if (conflictingCampaigns.length > 0) {
      const conflictNames = conflictingCampaigns.map((c) => c.name).join('、')
      launchWarnings.push(
        `注意：${campaignContactIds.length} 个联系人中有部分正在参与其他运行中的活动（${conflictNames}），可能导致同一联系人短时间内收到多封邮件。`
      )
    }

    // 获取可用的发件账户（优先使用绑定账户，否则自动选择）
    const availableAccountId = await getAvailableAccount(auth.userId!, campaign.emailAccountId)
    if (!availableAccountId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        '没有可用的发件账户：所有账户已达到日限额或已停用',
        400
      )
    }

    const contacts = await prisma.contact.findMany({
      where: {
        id: { in: campaignContactIds },
        tenantId: auth.tenantId,
      },
      include: {
        company: true,
        emails: {
          where: { isPrimary: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (contacts.length === 0) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '未找到有效的联系人', 400)
    }

    // H1: 查询 Campaign 关联的附件 ID
    const attachmentIds = await getCampaignAttachmentIds(auth.tenantId!, campaign.id)

    // #46: 检查租户每日发信限额（按本次实际待发送数量）
    const alreadySentForLimit = await prisma.emailLog.findMany({
      where: {
        campaignId: campaign.id,
        status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'] },
      },
      select: { contactId: true },
    })
    const sentForLimitIds = new Set(alreadySentForLimit.map((log) => log.contactId))
    const pendingForLimit = contacts.filter((c) => !sentForLimitIds.has(c.id))
    const maxQueueForLimit = campaign.throttlePerDay || 200
    const emailsToAdd = Math.min(pendingForLimit.length, maxQueueForLimit)
    const emailLimit = await checkDailyEmailLimit(auth.tenantId!, emailsToAdd)
    if (!emailLimit.allowed) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        `今日发信量已达上限（${emailLimit.current}/${emailLimit.max}），请升级套餐或等待明日重置`,
        403
      )
    }

    // #8: A/B 测试 — 50/50 分流，两变体各发一半联系人
    if (campaign.type === 'AB_TEST') {
      const variants = (campaign.sequence as any[]) || []
      if (variants.length < 2) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, 'A/B 测试需要配置两个变体', 400)
      }

      const alreadySent = await prisma.emailLog.findMany({
        where: {
          campaignId: campaign.id,
          status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'] },
        },
        select: { contactId: true },
      })
      const sentContactIds = new Set(alreadySent.map((log) => log.contactId))
      const pendingContacts = contacts.filter((c) => !sentContactIds.has(c.id))

      // Shuffle and split 50/50
      const shuffled = [...pendingContacts].sort(() => Math.random() - 0.5)
      const mid = Math.ceil(shuffled.length / 2)
      const groupA = shuffled.slice(0, mid)
      const groupB = shuffled.slice(mid)

      const variantA = variants[0]
      const variantB = variants[1]

      const buildJobs = (group: typeof contacts, variant: any, variantLabel: string) =>
        group
          .map((contact) => {
            const primaryEmail = contact.emails[0]
            if (!primaryEmail) return null
            const vars = buildContactVariables(contact, primaryEmail.address)
            return {
              to: primaryEmail.address,
              subject: applyEmailVariables(variant.subject, vars),
              html: applyEmailVariables(variant.htmlContent || variant.content || '', vars),
              text: applyEmailVariables(variant.content || '', vars),
              contactId: contact.id,
              campaignId: campaign.id,
              emailAccountId: availableAccountId,
              fromEmail: campaign.fromEmail || process.env.SMTP_USER || '',
              fromName: campaign.fromName || '',
              trackingPixel: true,
              trackingLinks: true,
              attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
            }
          })
          .filter(Boolean)

      const jobsA = buildJobs(groupA, variantA, 'A')
      const jobsB = buildJobs(groupB, variantB, 'B')
      const allJobs = [...jobsA, ...jobsB]

      if (allJobs.length === 0) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, '没有具有有效邮箱地址的联系人', 400)
      }

      const abTestAssignments: Record<string, 'A' | 'B'> = {}
      for (const job of jobsA) {
        if (job?.contactId) abTestAssignments[job.contactId] = 'A'
      }
      for (const job of jobsB) {
        if (job?.contactId) abTestAssignments[job.contactId] = 'B'
      }

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          status: 'RUNNING',
          sentAt: campaign.sentAt || new Date(),
          abTestEnabled: true,
          abTestVariant: 'A',
          abTestAssignments,
        },
      })

      // 分批限速
      const abPerHour = campaign.throttlePerHour || 50
      const abBatches: typeof allJobs[] = []
      for (let i = 0; i < allJobs.length; i += abPerHour) {
        abBatches.push(allJobs.slice(i, i + abPerHour))
      }
      const abJobIds: (string | undefined)[] = []
      for (let batchIdx = 0; batchIdx < abBatches.length; batchIdx++) {
        const delay = batchIdx * 60 * 60 * 1000
        const ids = await addBulkEmailJobs(abBatches[batchIdx] as any[], { delay })
        abJobIds.push(...ids)
      }

      await auditCampaignLaunch(req, auth, campaign.id, { type: 'AB_TEST', status: 'RUNNING' })

      return NextResponse.json({
        success: true,
        data: {
          campaignId: campaign.id,
          type: 'AB_TEST',
          status: 'RUNNING',
          groupA: jobsA.length,
          groupB: jobsB.length,
          batches: abBatches.length,
          jobIds: abJobIds,
        },
        warnings: launchWarnings.length > 0 ? launchWarnings : undefined,
      })
    }

    // #7: SEQUENCE 类型 — 仅发送第一步，后续步骤由 cron/advance-sequences 处理
    if (campaign.type === 'SEQUENCE') {
      const steps = (campaign.sequence as any[]) || []
      if (steps.length === 0) {
        return errorResponse(ErrorCodes.VALIDATION_ERROR, '序列活动需要配置至少一个步骤', 400)
      }

      const firstStep = steps[0]

      // Skip contacts already sent step 0
      const alreadySent = await prisma.emailLog.findMany({
        where: {
          campaignId: campaign.id,
          status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'] },
        },
        select: { contactId: true },
      })
      const sentContactIds = new Set(alreadySent.map((log) => log.contactId))
      const pendingContacts = contacts.filter((c) => !sentContactIds.has(c.id))
      const maxQueue = campaign.throttlePerDay || 200
      const contactSlice = pendingContacts.slice(0, maxQueue)

      const emailJobs = contactSlice
        .map((contact) => {
          const primaryEmail = contact.emails[0]
          if (!primaryEmail) return null

          const vars = buildContactVariables(contact, primaryEmail.address)
          const rawHtml = firstStep.htmlContent || firstStep.content || campaign.htmlContent || campaign.content || ''
          const subject = applyEmailVariables(firstStep.subject || campaign.subject, vars)
          const html = applyEmailVariables(rawHtml, vars)
          const text = applyEmailVariables(firstStep.content || campaign.content || '', vars)

          return {
            to: primaryEmail.address,
            subject,
            html,
            text,
            contactId: contact.id,
            campaignId: campaign.id,
            emailAccountId: availableAccountId,
            fromEmail: campaign.fromEmail || process.env.SMTP_USER || '',
            fromName: campaign.fromName || '',
            trackingPixel: true,
            trackingLinks: true,
            attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
          }
        })
        .filter(Boolean)

      if (emailJobs.length === 0) {
        return errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          campaign.status === 'PAUSED'
            ? '没有待发送的联系人（可能已全部发送）'
            : '没有具有有效邮箱地址的联系人',
          400
        )
      }

      // 标记序列启动，记录当前步骤索引
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          status: 'RUNNING',
          sentAt: campaign.sentAt || new Date(),
        },
      })

      // #5: throttlePerHour — SEQUENCE 首步同样分批限速
      const seqPerHour = campaign.throttlePerHour || 50
      const seqBatches: typeof emailJobs[] = []
      for (let i = 0; i < emailJobs.length; i += seqPerHour) {
        seqBatches.push(emailJobs.slice(i, i + seqPerHour))
      }

      const seqJobIds: (string | undefined)[] = []
      for (let batchIdx = 0; batchIdx < seqBatches.length; batchIdx++) {
        const delay = batchIdx * 60 * 60 * 1000
        const ids = await addBulkEmailJobs(seqBatches[batchIdx] as any[], { delay })
        seqJobIds.push(...ids)
      }

      await auditCampaignLaunch(req, auth, campaign.id, { type: 'SEQUENCE', status: 'RUNNING' })

      return NextResponse.json({
        success: true,
        data: {
          campaignId: campaign.id,
          type: 'SEQUENCE',
          status: 'RUNNING',
          currentStep: 0,
          totalSteps: steps.length,
          enqueued: emailJobs.length,
          skipped: contacts.length - pendingContacts.length,
          batches: seqBatches.length,
          throttlePerHour: seqPerHour,
          jobIds: seqJobIds,
        },
        warnings: launchWarnings.length > 0 ? launchWarnings : undefined,
      })
    }

    // SINGLE 类型 — 立即发送全部
    // Skip contacts already sent for this campaign
    const alreadySent = await prisma.emailLog.findMany({
      where: {
        campaignId: campaign.id,
        status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'] },
      },
      select: { contactId: true },
    })
    const sentContactIds = new Set(alreadySent.map((log) => log.contactId))

    const pendingContacts = contacts.filter((c) => !sentContactIds.has(c.id))
    const maxQueue = campaign.throttlePerDay || 200
    const contactSlice = pendingContacts.slice(0, maxQueue)

    const emailJobs = contactSlice
      .map((contact) => {
        const primaryEmail = contact.emails[0]
        if (!primaryEmail) return null

        const vars = buildContactVariables(contact, primaryEmail.address)
        const rawHtml = campaign.htmlContent || campaign.content || ''
        const subject = applyEmailVariables(campaign.subject, vars)
        const html = applyEmailVariables(rawHtml, vars)
        const text = applyEmailVariables(campaign.content || '', vars)

        return {
          to: primaryEmail.address,
          subject,
          html,
          text,
          contactId: contact.id,
          campaignId: campaign.id,
          emailAccountId: availableAccountId,  // 使用自动选择的发件账户
          fromEmail: campaign.fromEmail || process.env.SMTP_USER || '',
          fromName: campaign.fromName || '',
          trackingPixel: true,
          trackingLinks: true,
          attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
        }
      })
      .filter(Boolean)

    if (emailJobs.length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        campaign.status === 'PAUSED'
          ? '没有待发送的联系人（可能已全部发送）'
          : '没有具有有效邮箱地址的联系人',
        400
      )
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'RUNNING',
        sentAt: campaign.sentAt || new Date(),
      },
    })

    // #5: throttlePerHour — 将邮件分批，每批间隔 1 小时
    const perHour = campaign.throttlePerHour || 50
    const batches: typeof emailJobs[] = []
    for (let i = 0; i < emailJobs.length; i += perHour) {
      batches.push(emailJobs.slice(i, i + perHour))
    }

    const allJobIds: (string | undefined)[] = []
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const delay = batchIdx * 60 * 60 * 1000 // 第一批立即发，后续每批延迟 1 小时
      const ids = await addBulkEmailJobs(batches[batchIdx] as any[], { delay })
      allJobIds.push(...ids)
    }

    await auditCampaignLaunch(req, auth, campaign.id, { type: 'SINGLE', status: 'RUNNING', enqueued: emailJobs.length })

    return NextResponse.json({
      success: true,
      data: {
        campaignId: campaign.id,
        status: 'RUNNING',
        enqueued: emailJobs.length,
        skipped: contacts.length - pendingContacts.length,
        batches: batches.length,
        throttlePerHour: perHour,
        jobIds: allJobIds,
      },
      warnings: launchWarnings.length > 0 ? launchWarnings : undefined,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
