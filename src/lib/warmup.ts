/**
 * J2: EmailAccount Warm-up 策略
 * 新账户逐步递增 dailyLimit，避免突然大量发信触发垃圾邮件过滤。
 *
 * 曲线（默认 21 天达到目标）：
 *   Day 1-3:   5/day
 *   Day 4-7:   15/day
 *   Day 8-14:  30/day
 *   Day 15-21: 50/day
 *   Day 22+:   warmupTarget (默认 50)
 */

/** 根据 warmup 天数计算当天应设的 dailyLimit */
export function getWarmupDailyLimit(warmupDay: number, target: number = 50): number {
  if (warmupDay <= 0) return target // 未启用 warmup，直接返回目标值
  if (warmupDay <= 3) return 5
  if (warmupDay <= 7) return 15
  if (warmupDay <= 14) return 30
  if (warmupDay <= 21) return 50
  return target // warmup 完成
}

/** warmup 是否已完成（达到目标限额） */
export function isWarmupComplete(warmupDay: number): boolean {
  return warmupDay > 21
}

/**
 * 推进 warmup：每天调用一次，递增 warmupDay 并更新 dailyLimit。
 * 应在 dailySent 归零时（跨天重置）调用。
 */
export function advanceWarmupDay(currentDay: number): number {
  return currentDay + 1
}
