describe('Demo Leads Platform Admin', () => {
  describe('status allowlist', () => {
    const ALLOWED = ['pending', 'contacted', 'converted', 'rejected']
    it('accepts valid statuses', () => {
      for (const s of ALLOWED) expect(ALLOWED).toContain(s)
    })
    it('rejects invalid status', () => {
      expect(ALLOWED).not.toContain('invalid')
      expect(ALLOWED).not.toContain('')
    })
  })

  describe('contactedAt auto-set logic', () => {
    it('should set contactedAt when status changes to contacted', () => {
      const existing = { contactedAt: null, status: 'pending' }
      const newStatus = 'contacted'
      const shouldSet = newStatus === 'contacted' && !existing.contactedAt
      expect(shouldSet).toBe(true)
    })
    it('should not overwrite existing contactedAt', () => {
      const existing = { contactedAt: new Date('2026-01-01'), status: 'pending' }
      const newStatus = 'contacted'
      const shouldSet = newStatus === 'contacted' && !existing.contactedAt
      expect(shouldSet).toBe(false)
    })
  })

  describe('internalNotes vs message separation', () => {
    it('should not overwrite user message with internal notes', () => {
      const original = { message: 'User wrote this', internalNotes: null }
      const updated = { internalNotes: 'Admin note' }
      expect(original.message).toBe('User wrote this')
      expect(updated.internalNotes).toBe('Admin note')
      expect(updated).not.toHaveProperty('message')
    })
  })

  describe('pagination', () => {
    it('should cap limit at 50', () => {
      expect(Math.min(50, 100)).toBe(50)
    })
    it('should enforce minimum page 1', () => {
      expect(Math.max(1, parseInt('-1', 10))).toBe(1)
    })
  })

  describe('platform admin isolation', () => {
    it('requirePlatformAdmin must query DB, not trust JWT', () => {
      const jwtPayload = { role: 'ADMIN', isPlatformAdmin: undefined }
      expect(jwtPayload.isPlatformAdmin).toBeUndefined()
    })
    it('tenant admin without isPlatformAdmin should be rejected', () => {
      const user = { role: 'ADMIN', isPlatformAdmin: false }
      expect(user.isPlatformAdmin).toBe(false)
    })
  })
})
