/**
 * J2: Warm-up 策略单元测试
 */
import { getWarmupDailyLimit, isWarmupComplete, advanceWarmupDay } from '@/lib/warmup'

describe('warmup', () => {
  describe('getWarmupDailyLimit', () => {
    it('should return target when warmup is disabled (day 0)', () => {
      expect(getWarmupDailyLimit(0, 100)).toBe(100)
      expect(getWarmupDailyLimit(0, 50)).toBe(50)
    })

    it('should return 5 for days 1-3', () => {
      expect(getWarmupDailyLimit(1)).toBe(5)
      expect(getWarmupDailyLimit(2)).toBe(5)
      expect(getWarmupDailyLimit(3)).toBe(5)
    })

    it('should return 15 for days 4-7', () => {
      expect(getWarmupDailyLimit(4)).toBe(15)
      expect(getWarmupDailyLimit(7)).toBe(15)
    })

    it('should return 30 for days 8-14', () => {
      expect(getWarmupDailyLimit(8)).toBe(30)
      expect(getWarmupDailyLimit(14)).toBe(30)
    })

    it('should return 50 for days 15-21', () => {
      expect(getWarmupDailyLimit(15)).toBe(50)
      expect(getWarmupDailyLimit(21)).toBe(50)
    })

    it('should return target after day 21', () => {
      expect(getWarmupDailyLimit(22, 100)).toBe(100)
      expect(getWarmupDailyLimit(30, 200)).toBe(200)
    })
  })

  describe('isWarmupComplete', () => {
    it('should return false for days 1-21', () => {
      expect(isWarmupComplete(1)).toBe(false)
      expect(isWarmupComplete(21)).toBe(false)
    })

    it('should return true after day 21', () => {
      expect(isWarmupComplete(22)).toBe(true)
      expect(isWarmupComplete(100)).toBe(true)
    })

    it('should return false for day 0 (disabled)', () => {
      expect(isWarmupComplete(0)).toBe(false)
    })
  })

  describe('advanceWarmupDay', () => {
    it('should increment day by 1', () => {
      expect(advanceWarmupDay(0)).toBe(1)
      expect(advanceWarmupDay(1)).toBe(2)
      expect(advanceWarmupDay(21)).toBe(22)
    })
  })
})
