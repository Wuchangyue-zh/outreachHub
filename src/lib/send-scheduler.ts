/**
 * O2b: 智能发送调度器
 * 合并 Contact.timezone + industry 默认发送窗口
 * 与 sendingWindows 配置协同工作
 */

/** 发送窗口配置 */
export interface SendingWindow {
  start: string  // "09:00"
  end: string    // "17:00"
}

/** 行业默认发送窗口（UTC 偏移参考） */
const INDUSTRY_WINDOWS: Record<string, SendingWindow> = {
  // B2B 通用
  default: { start: '09:00', end: '17:00' },
  // 技术行业：稍晚
  technology: { start: '10:00', end: '18:00' },
  software: { start: '10:00', end: '18:00' },
  it: { start: '10:00', end: '18:00' },
  // 制造业：较早
  manufacturing: { start: '08:00', end: '16:00' },
  automotive: { start: '08:00', end: '16:00' },
  // 金融：标准
  finance: { start: '09:00', end: '17:00' },
  banking: { start: '09:00', end: '17:00' },
  // 零售：稍早
  retail: { start: '08:30', end: '16:30' },
  ecommerce: { start: '09:00', end: '17:00' },
  // 医疗
  healthcare: { start: '09:00', end: '16:00' },
  pharmaceutical: { start: '09:00', end: '17:00' },
  // 教育
  education: { start: '08:00', end: '16:00' },
}

/** 常见时区 → UTC 偏移映射（简化版） */
const TIMEZONE_OFFSETS: Record<string, number> = {
  'Asia/Shanghai': 8,
  'Asia/Tokyo': 9,
  'Asia/Seoul': 9,
  'Asia/Singapore': 8,
  'Asia/Hong_Kong': 8,
  'Asia/Kolkata': 5.5,
  'Asia/Dubai': 4,
  'Europe/London': 0,
  'Europe/Paris': 1,
  'Europe/Berlin': 1,
  'Europe/Madrid': 1,
  'Europe/Rome': 1,
  'Europe/Amsterdam': 1,
  'Europe/Moscow': 3,
  'America/New_York': -5,
  'America/Chicago': -6,
  'America/Denver': -7,
  'America/Los_Angeles': -8,
  'America/Sao_Paulo': -3,
  'Australia/Sydney': 11,
  'Pacific/Auckland': 13,
}

/**
 * 获取联系人的最佳发送窗口
 * 优先级：Campaign sendingWindows > Contact timezone + industry > 默认
 */
export function getContactSendingWindow(
  campaignWindow?: SendingWindow | null,
  contactTimezone?: string | null,
  contactIndustry?: string | null
): SendingWindow {
  // 1. 优先使用 Campaign 配置的发送窗口
  if (campaignWindow?.start && campaignWindow?.end) {
    return campaignWindow
  }

  // 2. 按行业匹配默认窗口
  if (contactIndustry) {
    const industryKey = contactIndustry.toLowerCase().replace(/[^a-z]/g, '')
    for (const [key, window] of Object.entries(INDUSTRY_WINDOWS)) {
      if (industryKey.includes(key) || key.includes(industryKey)) {
        return window
      }
    }
  }

  // 3. 默认窗口
  return INDUSTRY_WINDOWS.default
}

/**
 * 检查当前时间是否在发送窗口内
 * @param window 发送窗口（本地时间 HH:MM）
 * @param timezone 联系人时区（如 "America/New_York"）
 */
export function isInSendingWindow(
  window: SendingWindow,
  timezone?: string | null
): boolean {
  const now = new Date()

  // 获取目标时区的当前小时和分钟
  let hours: number
  let minutes: number

  if (timezone && TIMEZONE_OFFSETS[timezone] !== undefined) {
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000
    const targetMs = utcMs + TIMEZONE_OFFSETS[timezone] * 60 * 60 * 1000
    const targetDate = new Date(targetMs)
    hours = targetDate.getHours()
    minutes = targetDate.getMinutes()
  } else {
    // 默认使用 UTC
    hours = now.getUTCHours()
    minutes = now.getUTCMinutes()
  }

  const currentMinutes = hours * 60 + minutes
  const [startH, startM] = window.start.split(':').map(Number)
  const [endH, endM] = window.end.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}

/**
 * 检查是否应该立即发送（综合考虑窗口和限流）
 * 用于 advance-sequences 和 launch-scheduled
 */
export function shouldSendNow(
  campaignWindow?: SendingWindow | null,
  contactTimezone?: string | null,
  contactIndustry?: string | null
): boolean {
  const window = getContactSendingWindow(campaignWindow, contactTimezone, contactIndustry)
  return isInSendingWindow(window, contactTimezone)
}

/**
 * 计算下一次发送窗口开始时间（用于 scheduled 场景）
 * @returns Date 对象，表示下一次窗口开始的 UTC 时间
 */
export function getNextWindowStart(
  window: SendingWindow,
  timezone?: string | null
): Date {
  const now = new Date()
  const [startH, startM] = window.start.split(':').map(Number)

  let targetDate: Date

  if (timezone && TIMEZONE_OFFSETS[timezone] !== undefined) {
    // 在目标时区计算
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000
    const targetMs = utcMs + TIMEZONE_OFFSETS[timezone] * 60 * 60 * 1000
    targetDate = new Date(targetMs)
  } else {
    targetDate = new Date(now)
  }

  targetDate.setHours(startH, startM, 0, 0)

  // 如果目标时间已过，推到明天
  if (targetDate <= now) {
    targetDate.setDate(targetDate.getDate() + 1)
  }

  // 转回 UTC
  if (timezone && TIMEZONE_OFFSETS[timezone] !== undefined) {
    const offsetMs = TIMEZONE_OFFSETS[timezone] * 60 * 60 * 1000
    return new Date(targetDate.getTime() - offsetMs - now.getTimezoneOffset() * 60 * 1000)
  }

  return targetDate
}
