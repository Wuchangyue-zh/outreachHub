import {
  validateWizardSequence,
  serializeSequenceForApi,
  getStepType,
  type SequenceStepPayload,
} from '@/lib/sequence-utils'

describe('sequence-utils', () => {
  it('validateWizardSequence accepts email + wait + condition with branches', () => {
    const steps: SequenceStepPayload[] = [
      { id: 's1', type: 'email', subject: 'Hi', content: 'Body', delayHours: 0 },
      { id: 's2', type: 'wait', subject: '', content: '', delayHours: 24 },
      {
        id: 's3',
        type: 'condition',
        subject: '',
        content: '',
        delayHours: 0,
        conditionType: 'opened',
        lookbackHours: 72,
        branches: { true: 's4', false: 's5' },
      },
      { id: 's4', type: 'email', subject: 'Follow up', content: 'Yes', delayHours: 0 },
      { id: 's5', type: 'email', subject: 'Bump', content: 'No', delayHours: 0 },
    ]
    expect(validateWizardSequence(steps)).toBe(true)
  })

  it('validateWizardSequence rejects wait-only steps without email', () => {
    expect(
      validateWizardSequence([
        { type: 'wait', subject: '', content: '', delayHours: 24 },
      ])
    ).toBe(false)
  })

  it('serializeSequenceForApi preserves condition metadata', () => {
    const serialized = serializeSequenceForApi([
      {
        id: 'c1',
        type: 'condition',
        subject: '',
        content: '',
        delayHours: 0,
        conditionType: 'not_opened',
        lookbackHours: 48,
        branches: { true: 'e1', false: 'e2' },
      },
    ])
    expect(serialized[0]).toMatchObject({
      id: 'c1',
      type: 'condition',
      conditionType: 'not_opened',
      branches: { true: 'e1', false: 'e2' },
    })
    expect(getStepType(serialized[0] as SequenceStepPayload)).toBe('condition')
  })
})
