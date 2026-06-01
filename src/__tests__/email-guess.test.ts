/**
 * M2a: 邮箱格式推测 + M3a: 验证流水线单元测试
 */
import { generateEmailCandidates, isValidEmailFormat, isDisposableEmail } from '@/lib/email-guess'

describe('email-guess', () => {
  describe('generateEmailCandidates', () => {
    it('should generate common patterns', () => {
      const candidates = generateEmailCandidates('John', 'Doe', 'example.com')
      expect(candidates.length).toBeGreaterThanOrEqual(6)
      expect(candidates).toContain('john.doe@example.com')
      expect(candidates).toContain('johndoe@example.com')
      expect(candidates).toContain('jdoe@example.com')
      expect(candidates).toContain('john@example.com')
      expect(candidates).toContain('doe@example.com')
    })

    it('should handle empty names gracefully', () => {
      const candidates = generateEmailCandidates('', '', 'example.com')
      expect(candidates.length).toBeGreaterThan(0)
    })

    it('should normalize to lowercase', () => {
      const candidates = generateEmailCandidates('John', 'Doe', 'Example.COM')
      expect(candidates.every((c) => c === c.toLowerCase())).toBe(true)
    })
  })

  describe('isValidEmailFormat', () => {
    it('should accept valid emails', () => {
      expect(isValidEmailFormat('test@example.com')).toBe(true)
      expect(isValidEmailFormat('user.name+tag@domain.co')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmailFormat('not-an-email')).toBe(false)
      expect(isValidEmailFormat('@no-local.com')).toBe(false)
      expect(isValidEmailFormat('no-at-sign.com')).toBe(false)
    })
  })

  describe('isDisposableEmail', () => {
    it('should detect disposable domains', () => {
      expect(isDisposableEmail('test@mailinator.com')).toBe(true)
      expect(isDisposableEmail('test@guerrillamail.com')).toBe(true)
      expect(isDisposableEmail('test@yopmail.com')).toBe(true)
    })

    it('should allow normal domains', () => {
      expect(isDisposableEmail('test@gmail.com')).toBe(false)
      expect(isDisposableEmail('test@company.com')).toBe(false)
    })
  })
})
