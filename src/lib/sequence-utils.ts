/**
 * O1: 序列步骤共享工具（向导 / API / Cron 一致）
 */

export type SequenceNodeType = 'email' | 'wait' | 'condition'
export type ConditionType = 'opened' | 'clicked' | 'replied' | 'not_opened'

export interface SequenceStepPayload {
  id?: string
  type?: SequenceNodeType
  subject: string
  content: string
  htmlContent?: string
  delayHours: number
  conditionType?: ConditionType
  lookbackHours?: number
  branches?: { true: string; false: string }
}

export function getStepType(step: SequenceStepPayload): SequenceNodeType {
  return step.type || 'email'
}

export function createStepId(existing: SequenceStepPayload[]): string {
  return `step-${existing.length + 1}-${Math.random().toString(36).slice(2, 7)}`
}

export function validateWizardSequence(steps: SequenceStepPayload[]): boolean {
  if (steps.length === 0) return false
  if (!steps.some((s) => getStepType(s) === 'email')) return false

  for (const step of steps) {
    const type = getStepType(step)
    if (type === 'email') {
      if (!step.subject?.trim() || !step.content?.trim()) return false
    } else if (type === 'wait') {
      if (!step.delayHours || step.delayHours < 1) return false
    } else if (type === 'condition') {
      const valid = ['opened', 'clicked', 'replied', 'not_opened']
      if (!step.conditionType || !valid.includes(step.conditionType)) return false
      if (!step.branches?.true?.trim() || !step.branches?.false?.trim()) return false
    }
  }
  return true
}

export function serializeSequenceForApi(steps: SequenceStepPayload[]) {
  return steps.map((step, idx) => {
    const type = getStepType(step)
    return {
      id: step.id || `step-${idx + 1}`,
      type,
      subject: step.subject || '',
      content: step.content || '',
      htmlContent: step.htmlContent || (step.content ? step.content.replace(/\n/g, '<br/>') : ''),
      delayHours: step.delayHours ?? (idx === 0 ? 0 : 24),
      ...(type === 'condition' && {
        conditionType: step.conditionType,
        lookbackHours: step.lookbackHours ?? 72,
        branches: step.branches,
      }),
    }
  })
}

export function getFirstEmailStep(steps: SequenceStepPayload[]) {
  return steps.find((s) => getStepType(s) === 'email')
}
