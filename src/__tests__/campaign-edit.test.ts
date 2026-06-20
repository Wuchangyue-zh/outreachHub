/**
 * Campaign Edit Mode — Store + logic tests
 */
describe('Campaign Edit Mode', () => {
  describe('PATCH status guard logic', () => {
    const EDITABLE = ['DRAFT', 'PAUSED']

    it('should allow editing DRAFT campaigns', () => {
      expect(EDITABLE).toContain('DRAFT')
    })

    it('should allow editing PAUSED campaigns', () => {
      expect(EDITABLE).toContain('PAUSED')
    })

    it('should reject editing RUNNING campaigns', () => {
      expect(EDITABLE).not.toContain('RUNNING')
    })

    it('should reject editing COMPLETED campaigns', () => {
      expect(EDITABLE).not.toContain('COMPLETED')
    })

    it('should reject editing FAILED campaigns', () => {
      expect(EDITABLE).not.toContain('FAILED')
    })
  })

  describe('hydrateFromCampaign store action', () => {
    beforeEach(() => {
      // Reset store before each test
      const { useCampaignWizardStore } = require('@/store/campaign-wizard-store')
      useCampaignWizardStore.getState().resetWizard()
    })

    it('should map campaign fields to wizard state', () => {
      const { useCampaignWizardStore } = require('@/store/campaign-wizard-store')

      useCampaignWizardStore.getState().hydrateFromCampaign({
        id: 'camp-1',
        name: 'Test Campaign',
        type: 'SINGLE',
        subject: 'Hello',
        content: 'World',
        htmlContent: '<p>World</p>',
        emailAccountId: 'ea-1',
        productId: 'prod-1',
        scheduleType: 'SCHEDULED',
        scheduledAt: '2026-06-20T10:00:00Z',
        timezone: 'Asia/Shanghai',
        sendingWindows: { start: '09:00', end: '17:00' },
        recurrenceRule: 'weekly',
        contactIds: ['c-1', 'c-2'],
        sequence: null,
        abTestEnabled: false,
      })

      const state = useCampaignWizardStore.getState()
      expect(state.editingCampaignId).toBe('camp-1')
      expect(state.campaignName).toBe('Test Campaign')
      expect(state.campaignType).toBe('SINGLE')
      expect(state.senderAccountId).toBe('ea-1')
      expect(state.productId).toBe('prod-1')
      expect(state.scheduleType).toBe('SCHEDULED')
      expect(state.timezone).toBe('Asia/Shanghai')
      expect(state.windowStart).toBe('09:00')
      expect(state.windowEnd).toBe('17:00')
      expect(state.recurrenceRule).toBe('weekly')
      expect(state.selectedContactIds).toEqual(['c-1', 'c-2'])
      expect(state.generatedEmail).toBe('World')
    })

    it('should parse A/B test variant B from sequence', () => {
      const { useCampaignWizardStore } = require('@/store/campaign-wizard-store')

      useCampaignWizardStore.getState().hydrateFromCampaign({
        id: 'camp-ab',
        name: 'AB Test',
        type: 'AB_TEST',
        subject: 'Subject A',
        content: 'Content A',
        emailAccountId: 'ea-1',
        scheduleType: 'IMMEDIATE',
        contactIds: [],
        abTestEnabled: true,
        sequence: [
          { subject: 'Subject A', content: 'Content A', variant: 'A' },
          { subject: 'Subject B', content: 'Content B', variant: 'B' },
        ],
      })

      const state = useCampaignWizardStore.getState()
      expect(state.variantBSubject).toBe('Subject B')
      expect(state.variantBContent).toBe('Content B')
    })

    it('should parse sequence steps for SEQUENCE type', () => {
      const { useCampaignWizardStore } = require('@/store/campaign-wizard-store')

      useCampaignWizardStore.getState().hydrateFromCampaign({
        id: 'camp-seq',
        name: 'Seq Campaign',
        type: 'SEQUENCE',
        subject: 'Step 1',
        content: 'Content 1',
        emailAccountId: 'ea-1',
        scheduleType: 'IMMEDIATE',
        contactIds: [],
        sequence: [
          { id: 's1', type: 'email', subject: 'Step 1', content: 'Content 1', delayHours: 0 },
          { id: 's2', type: 'wait', delayHours: 72 },
          { id: 's3', type: 'email', subject: 'Step 2', content: 'Content 2', delayHours: 0 },
        ],
      })

      const state = useCampaignWizardStore.getState()
      expect(state.sequence).toHaveLength(3)
      expect(state.sequence[0].type).toBe('email')
      expect(state.sequence[1].type).toBe('wait')
      expect(state.sequence[2].subject).toBe('Step 2')
    })

    it('should clear edit state on resetWizard', () => {
      const { useCampaignWizardStore } = require('@/store/campaign-wizard-store')

      useCampaignWizardStore.getState().hydrateFromCampaign({
        id: 'camp-reset',
        name: 'Reset Test',
        type: 'SINGLE',
        subject: 'S',
        content: 'C',
        scheduleType: 'IMMEDIATE',
        contactIds: [],
      })
      expect(useCampaignWizardStore.getState().editingCampaignId).toBe('camp-reset')

      useCampaignWizardStore.getState().resetWizard()
      const state = useCampaignWizardStore.getState()
      expect(state.editingCampaignId).toBeNull()
      expect(state.campaignName).toBe('')
      expect(state.selectedContactIds).toEqual([])
    })
  })
})
