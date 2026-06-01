/**
 * N3a: 海关买家采购意向评分
 * 4 维度 → 加权 0-100 分 + 可选 AI 摘要
 */

import { createChatCompletion } from './openai'

export interface ScoreBreakdown {
  frequency: number      // 采购频次（权重 30%）
  trend: number          // 金额趋势（权重 25%）
  diversification: number // 供应商分散度（权重 25%）
  recency: number        // 最近采购（权重 20%）
}

export interface ScoreResult {
  total: number
  breakdown: ScoreBreakdown
  label: 'high' | 'medium' | 'low'
}

// 权重常量
const WEIGHTS = {
  frequency: 0.30,
  trend: 0.25,
  diversification: 0.25,
  recency: 0.20,
} as const

/**
 * 计算采购意向评分
 * @param profile 买家画像（DB 记录或 provider 返回的聚合数据）
 */
export function calculatePurchaseIntentScore(profile: {
  totalShipments: number
  totalAmountUsd: number
  supplierCount: number
  lastShipmentDate?: string | Date | null
  firstShipmentDate?: string | Date | null
  topSuppliers?: Array<{ shipmentCount: number; lastShipmentDate?: string }>
  shipments?: Array<{ shipmentDate?: string; amountUsd?: number }>
}): ScoreResult {
  const breakdown: ScoreBreakdown = {
    frequency: scoreFrequency(profile.totalShipments),
    trend: scoreTrend(profile),
    diversification: scoreDiversification(profile.supplierCount, profile.topSuppliers),
    recency: scoreRecency(profile.lastShipmentDate),
  }

  const total = Math.round(
    breakdown.frequency * WEIGHTS.frequency +
    breakdown.trend * WEIGHTS.trend +
    breakdown.diversification * WEIGHTS.diversification +
    breakdown.recency * WEIGHTS.recency
  )

  const label: ScoreResult['label'] = total >= 70 ? 'high' : total >= 40 ? 'medium' : 'low'

  return { total, breakdown, label }
}

/**
 * 频次评分：近 12 个月装运次数
 */
function scoreFrequency(totalShipments: number): number {
  if (totalShipments >= 30) return 100
  if (totalShipments >= 16) return 75
  if (totalShipments >= 6) return 50
  if (totalShipments >= 1) return 20
  return 0
}

/**
 * 趋势评分：近 6 个月 vs 前 6 个月金额变化
 */
function scoreTrend(profile: {
  shipments?: Array<{ shipmentDate?: string; amountUsd?: number }>
  totalAmountUsd: number
}): number {
  if (!profile.shipments || profile.shipments.length < 2) {
    // 无装运明细时，用总量做一个粗略估计
    return profile.totalAmountUsd > 10_000_000 ? 70 : profile.totalAmountUsd > 1_000_000 ? 50 : 30
  }

  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime() - 180 * 86400000)
  const twelveMonthsAgo = new Date(now.getTime() - 365 * 86400000)

  let recentAmount = 0
  let priorAmount = 0

  for (const s of profile.shipments) {
    if (!s.shipmentDate || !s.amountUsd) continue
    const d = new Date(s.shipmentDate)
    if (d >= sixMonthsAgo) {
      recentAmount += s.amountUsd
    } else if (d >= twelveMonthsAgo) {
      priorAmount += s.amountUsd
    }
  }

  if (priorAmount === 0) return recentAmount > 0 ? 80 : 30

  const growthRate = (recentAmount - priorAmount) / priorAmount

  if (growthRate > 0.2) return 100
  if (growthRate > 0.05) return 75
  if (growthRate > -0.05) return 50
  if (growthRate > -0.2) return 25
  return 0
}

/**
 * 供应商分散度评分
 */
function scoreDiversification(
  supplierCount: number,
  topSuppliers?: Array<{ shipmentCount: number; lastShipmentDate?: string }>
): number {
  let base: number
  if (supplierCount >= 7) base = 100
  else if (supplierCount >= 4) base = 70
  else if (supplierCount >= 2) base = 40
  else base = 0

  // 新供应商加分：近 6 个月有新装运的供应商
  if (topSuppliers && topSuppliers.length > 0) {
    const sixMonthsAgo = new Date(Date.now() - 180 * 86400000)
    const hasNewSupplier = topSuppliers.some(
      (s) => s.lastShipmentDate && new Date(s.lastShipmentDate) >= sixMonthsAgo
    )
    if (hasNewSupplier) base = Math.min(100, base + 15)
  }

  return base
}

/**
 * 最近采购评分
 */
function scoreRecency(lastShipmentDate?: string | Date | null): number {
  if (!lastShipmentDate) return 0

  const lastDate = typeof lastShipmentDate === 'string' ? new Date(lastShipmentDate) : lastShipmentDate
  if (isNaN(lastDate.getTime())) return 0

  const daysAgo = (Date.now() - lastDate.getTime()) / 86400000

  if (daysAgo <= 30) return 100
  if (daysAgo <= 90) return 80
  if (daysAgo <= 180) return 50
  if (daysAgo <= 365) return 20
  return 0
}

/**
 * N3c: AI 摘要生成（可选）
 * 无 OPENAI_API_KEY 时使用模板摘要
 */
export async function generateBuyerAiSummary(
  profile: {
    companyName: string
    country?: string
    totalShipments: number
    totalAmountUsd: number
    supplierCount: number
    lastShipmentDate?: string | null
    topHsCodes?: Array<{ code: string; description?: string }>
  },
  score: ScoreResult
): Promise<string> {
  // 尝试用 LLM 生成
  try {
    const hsInfo = profile.topHsCodes?.slice(0, 3).map((h) => `${h.code}(${h.description || ''})`).join('、') || '无'
    const prompt = `你是外贸数据分析专家。请用1-2句中文简要分析以下买家的采购意向：

买家名称：${profile.companyName}
所在国家：${profile.country || '未知'}
总装运次数：${profile.totalShipments}
总金额(USD)：${profile.totalAmountUsd.toLocaleString()}
供应商数：${profile.supplierCount}
最近装运：${profile.lastShipmentDate || '未知'}
主要HS编码：${hsInfo}
评分：${score.total}/100 (${score.label})
维度：频次${score.breakdown.frequency} 趋势${score.breakdown.trend} 分散度${score.breakdown.diversification} 最近${score.breakdown.recency}

要求：分析为何该买家意向为${score.label}，给出行销建议。只输出分析文本，不要标题。`

    const result = await createChatCompletion([{ role: 'user', content: prompt }], {
      temperature: 0.5,
      max_tokens: 200,
    })

    const text = result.choices?.[0]?.message?.content?.trim()
    if (text) return text
  } catch {
    // LLM 调用失败时 fallback 到模板
  }

  // 模板 fallback
  return generateTemplateSummary(profile, score)
}

function generateTemplateSummary(
  profile: { companyName: string; totalShipments: number; supplierCount: number; lastShipmentDate?: string | null },
  score: ScoreResult
): string {
  const parts: string[] = []

  if (score.label === 'high') {
    parts.push(`${profile.companyName}采购意向高`)
    if (score.breakdown.frequency >= 80) parts.push('采购频次密集')
    if (score.breakdown.recency >= 80) parts.push('近期有活跃装运')
    if (score.breakdown.diversification >= 70) parts.push('供应商多元化表明需求扩张')
  } else if (score.label === 'medium') {
    parts.push(`${profile.companyName}采购意向中等`)
    if (score.breakdown.recency < 60) parts.push('最近采购距今较久')
    if (score.breakdown.frequency < 50) parts.push('采购频次一般')
  } else {
    parts.push(`${profile.companyName}采购意向较低`)
    if (profile.supplierCount <= 2) parts.push('供应商高度集中')
    if (score.breakdown.recency < 30) parts.push('长时间无新装运')
  }

  parts.push(`共${profile.totalShipments}笔装运、${profile.supplierCount}家供应商。`)
  return parts.join('，') + '。'
}
