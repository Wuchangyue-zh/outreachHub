/**
 * O2a: 序列推进 Cron Job
 * 支持 linear / wait / condition 分支
 * 与 architecture.md sequence JSON Schema 一致
 */
import { prisma } from '@/lib/prisma'
import { addBulkEmailJobs } from '@/lib/email-queue'
import { applyEmailVariables, buildContactVariables } from '@/lib/email-variables'
import { getAvailableAccount } from '@/lib/select-email-account'
import { getCampaignContactIds } from '@/lib/campaign-contacts'
import { getCampaignAttachmentIds } from '@/lib/campaign-attachments'
import { shouldSendNow, type SendingWindow } from '@/lib/send-scheduler'

/**
 * 序列步骤节点（与 architecture.md 文档一致）
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
}

/**
 * 将旧格式 [{subject, content, delayHours}] 标准化为新格式
 */
function normalizeSteps(steps: any[]): SequenceStepNode[] {
  return steps.map((step, idx) => {
    if (step.id && step.type) return step as SequenceStepNode
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
 * 构建步骤 id → index 映射
 */
function buildStepIndex(steps: SequenceStepNode[]): Map<string, number> {
  const map = new Map<string, number>()
  steps.forEach((step, idx) => map.set(step.id, idx))
  return map
}

/**
 * 计算联系人在序列中的当前步骤索引
 * 基于 EmailLog 中该 campaign 的邮件数量
 */
function getContactCurrentStep(
  contactId: string,
  sentCountMap: Map<string, number>
): number {
  return sentCountMap.get(contactId) || 0
}

/**
 * 判断 condition 步骤的条件是否满足
 */
async function evaluateCondition(
  campaignId: string,
  contactId: string,
  conditionType: string,
  lookbackHours: number
): Promise<boolean> {
  const lookbackDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000)

  const log = await prisma.emailLog.findFirst({
    where: {
      campaignId,
      contactId,
      createdAt: { gte: lookbackDate },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      status: true,
      openedAt: true,
      clickedAt: true,
      repliedAt: true,
    },
  })

  if (!log) return false

  switch (conditionType) {
    case 'opened':
      return !!log.openedAt || ['OPENED', 'CLICKED', 'REPLIED'].includes(log.status)
    case 'clicked':
      return !!log.clickedAt || ['CLICKED', 'REPLIED'].includes(log.status)
    case 'replied':
      return !!log.repliedAt || log.status === 'REPLIED'
    case 'not_opened':
      return !log.openedAt && !['OPENED', 'CLICKED', 'REPLIED'].includes(log.status)
    default:
      return false
  }
}

/**
 * 从序列中提取线性主路径步骤（用于兼容旧的全路径完成检测）
 * 忽略 condition 分支，取线性路径上的 email 步骤
 */
function getLinearEmailSteps(steps: SequenceStepNode[]): SequenceStepNode[] {
  const emailSteps: SequenceStepNode[] = []
  for (const step of steps) {
    if (step.type === 'email') {
      emailSteps.push(step)
    }
    // wait 步骤不计入邮件数，condition 步骤跳过
  }
  return emailSteps
}

export async function executeAdvanceSequences() {
  const campaigns = await prisma.campaign.findMany({
    where: { type: 'SEQUENCE', status: 'RUNNING' },
  })

  if (campaigns.length === 0) {
    return { processed: 0, message: '没有进行中的序列活动', results: [] }
  }

  const results: Array<{ campaignId: string; action: string; details?: string }> = []

  for (const campaign of campaigns) {
    const rawSteps = (campaign.sequence as any[]) || []
    if (rawSteps.length === 0) {
      results.push({ campaignId: campaign.id, action: 'skip', details: '无步骤配置' })
      continue
    }

    const steps = normalizeSteps(rawSteps)
    const stepIndex = buildStepIndex(steps)
    const linearEmailSteps = getLinearEmailSteps(steps)

    const contactIds = await getCampaignContactIds(campaign.id)
    if (contactIds.length === 0) {
      results.push({ campaignId: campaign.id, action: 'skip', details: '无联系人' })
      continue
    }

    // 查询每个联系人已发送的邮件数（用于计算当前步骤）
    const logs = await prisma.emailLog.groupBy({
      by: ['contactId'],
      where: {
        campaignId: campaign.id,
        contactId: { in: contactIds },
        status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'] },
      },
      _count: { id: true },
    })

    const sentCountMap = new Map<string, number>()
    for (const log of logs) {
      sentCountMap.set(log.contactId, log._count.id)
    }

    // 检查是否全部完成（基于线性 email 步骤数）
    const allCompleted = contactIds.every((cid) => {
      const count = sentCountMap.get(cid) || 0
      return count >= linearEmailSteps.length
    })

    if (allCompleted) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
      results.push({ campaignId: campaign.id, action: 'completed', details: `全部 ${linearEmailSteps.length} 步已完成` })
      continue
    }

    // 获取发件账户
    const userId = await prisma.user.findFirst({
      where: { tenantId: campaign.tenantId! },
      select: { id: true },
    })
    const availableAccountId = userId
      ? await getAvailableAccount(userId.id, campaign.emailAccountId)
      : null

    if (!availableAccountId) {
      results.push({ campaignId: campaign.id, action: 'error', details: '无可用发件账户' })
      continue
    }

    const sendingWindows = campaign.sendingWindows as { start?: string; end?: string } | null
    const campaignWindow: SendingWindow | null =
      sendingWindows?.start && sendingWindows?.end
        ? { start: sendingWindows.start, end: sendingWindows.end }
        : null

    const attachmentIds = campaign.tenantId
      ? await getCampaignAttachmentIds(campaign.tenantId, campaign.id)
      : []

    // 逐联系人推进
    let advanced = 0
    let skipped = 0
    let waiting = 0

    for (const contactId of contactIds) {
      const currentEmailCount = sentCountMap.get(contactId) || 0

      // 找到当前应执行的步骤
      // 简化逻辑：按线性 email 步骤推进，遇到 condition/wait 在此处求值
      let targetStep: SequenceStepNode | null = null
      let emailStepIndex = 0

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]

        if (step.type === 'email') {
          if (emailStepIndex === currentEmailCount) {
            targetStep = step
            break
          }
          emailStepIndex++
        } else if (step.type === 'wait') {
          // wait 步骤：检查延迟是否已过
          // wait 不增加 emailStepIndex，但需要检查上一封邮件的发送时间
          if (emailStepIndex === currentEmailCount && currentEmailCount > 0) {
            const lastLog = await prisma.emailLog.findFirst({
              where: {
                campaignId: campaign.id,
                contactId,
                status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED'] },
              },
              orderBy: { sentAt: 'desc' },
              select: { sentAt: true },
            })

            if (lastLog?.sentAt) {
              const elapsedHours = (Date.now() - lastLog.sentAt.getTime()) / (1000 * 60 * 60)
              if (elapsedHours < (step.delayHours || 0)) {
                waiting++
                break // 延迟未到，跳过此联系人
              }
            }
            // 延迟已过，继续找下一个 email 步骤
            continue
          }
        } else if (step.type === 'condition') {
          // condition 步骤：求值并跳转
          if (emailStepIndex === currentEmailCount) {
            const conditionResult = await evaluateCondition(
              campaign.id,
              contactId,
              step.conditionType || 'opened',
              step.lookbackHours || 72
            )

            const targetStepId = conditionResult
              ? step.branches?.true
              : step.branches?.false

            if (targetStepId && stepIndex.has(targetStepId)) {
              const targetIdx = stepIndex.get(targetStepId)!
              const branchStep = steps[targetIdx]
              if (branchStep.type === 'email') {
                targetStep = branchStep
              }
            }
            break
          }
        }
      }

      if (!targetStep) {
        skipped++
        continue
      }

      // 发送邮件
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, tenantId: campaign.tenantId! },
        include: {
          company: true,
          emails: { where: { isPrimary: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
      })

      if (!contact || !contact.emails[0]) {
        skipped++
        continue
      }

      // O2b: 按 Campaign 窗口 + 联系人行业判断是否可发
      if (!shouldSendNow(campaignWindow, campaign.timezone || null, contact.company?.industry || null)) {
        waiting++
        continue
      }

      const primaryEmail = contact.emails[0]
      const vars = buildContactVariables(contact, primaryEmail.address)
      const rawHtml = targetStep.htmlContent || targetStep.content || ''

      await addBulkEmailJobs([{
        to: primaryEmail.address,
        subject: applyEmailVariables(targetStep.subject || campaign.subject, vars),
        html: applyEmailVariables(rawHtml, vars),
        text: applyEmailVariables(targetStep.content || '', vars),
        contactId: contact.id,
        campaignId: campaign.id,
        emailAccountId: availableAccountId,
        fromEmail: campaign.fromEmail || process.env.SMTP_USER || '',
        fromName: campaign.fromName || '',
        trackingPixel: true,
        trackingLinks: true,
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      }])

      advanced++
    }

    if (advanced > 0 || waiting > 0) {
      results.push({
        campaignId: campaign.id,
        action: advanced > 0 ? 'advanced' : 'waiting',
        details: `推进 ${advanced} 封，跳过 ${skipped}，等待 ${waiting}`,
      })
    } else {
      results.push({
        campaignId: campaign.id,
        action: 'skip',
        details: `无待发送联系人（跳过 ${skipped}）`,
      })
    }
  }

  return { processed: campaigns.length, results }
}
