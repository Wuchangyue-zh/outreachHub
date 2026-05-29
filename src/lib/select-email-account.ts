import { prisma } from './prisma'

/**
 * EmailAccount 选择策略配置
 */
interface AccountSelectionConfig {
  /** 健康度权重 (0-100) */
  healthWeight?: number
  /** 发送量权重 (0-100)，用于负载均衡 */
  loadWeight?: number
  /** 跳过健康度低于此阈值的账户 */
  minHealthScore?: number
  /** 轮换间隔（毫秒），避免短时间内重复使用同一账户 */
  rotationInterval?: number
  /** 缓存最大条目数 */
  maxCacheSize?: number
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<AccountSelectionConfig> = {
  healthWeight: 70,
  loadWeight: 30,
  minHealthScore: 50,
  rotationInterval: 60 * 1000, // 1 分钟
  maxCacheSize: 1000,
}

/**
 * 内存缓存：记录每个用户最近使用的账户和时间
 * Key 格式: `${userId}:${accountId}`
 */
const lastUsedCache = new Map<string, { accountId: string; timestamp: number }>()

/**
 * 内联检查日限额（避免 N+1 查询）
 * 使用已获取的数据，不额外查询数据库
 */
function isDailyLimitOk(account: {
  dailySent: number
  dailyLimit: number
  lastResetAt: Date
}): boolean {
  const now = new Date()
  const lastReset = new Date(account.lastResetAt)

  // 检查是否需要重置（跨天）
  const isNewDay =
    now.getDate() !== lastReset.getDate() ||
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear()

  // 如果是新的一天，理论上应该重置，但这里只做判断不做实际重置
  // 实际重置由 sendAccountMail 中的 checkDailyLimit 处理
  if (isNewDay) {
    return true
  }

  return account.dailySent < account.dailyLimit
}

/**
 * 清理过期的缓存条目
 */
function pruneCache(): void {
  const now = Date.now()
  const maxAge = DEFAULT_CONFIG.rotationInterval * 10 // 保留 10 倍轮换间隔的历史

  for (const [key, value] of lastUsedCache.entries()) {
    if (now - value.timestamp > maxAge) {
      lastUsedCache.delete(key)
    }
  }

  // 如果仍然超过最大大小，删除最旧的条目
  if (lastUsedCache.size > DEFAULT_CONFIG.maxCacheSize) {
    const entries = Array.from(lastUsedCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

    const toDelete = entries.slice(0, entries.length - DEFAULT_CONFIG.maxCacheSize)
    for (const [key] of toDelete) {
      lastUsedCache.delete(key)
    }
  }
}

/**
 * 选择最佳可用的 EmailAccount
 *
 * 轮换策略：
 * 1. 过滤掉不活跃、达到日限额、健康度低于阈值的账户
 * 2. 如果配置了轮换间隔，跳过最近使用过的账户
 * 3. 使用加权评分排序（健康度 + 负载均衡）
 * 4. 返回最佳账户
 *
 * @param userId 用户ID
 * @param config 可选配置
 * @returns EmailAccount ID 或 null（无可用账户）
 */
export async function selectEmailAccount(
  userId: string,
  config?: Partial<AccountSelectionConfig>
): Promise<string | null> {
  // 参数验证
  if (!userId) {
    console.error('[selectEmailAccount] userId is required')
    return null
  }

  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  // 定期清理缓存
  pruneCache()

  // 1. 获取用户所有活跃账户
  const accounts = await prisma.emailAccount.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      healthScore: true,
      dailySent: true,
      dailyLimit: true,
      lastResetAt: true,
    },
  })

  if (accounts.length === 0) {
    console.warn(`[selectEmailAccount] No active accounts found for user ${userId}`)
    return null
  }

  // 2. 过滤账户
  const eligibleAccounts: typeof accounts = []

  for (const account of accounts) {
    // 检查健康度阈值
    if (account.healthScore < mergedConfig.minHealthScore) {
      continue
    }

    // 使用内联检查日限额（避免 N+1 查询）
    if (!isDailyLimitOk(account)) {
      continue
    }

    // 检查轮换间隔
    if (mergedConfig.rotationInterval > 0) {
      const lastUsed = lastUsedCache.get(`${userId}:${account.id}`)
      if (lastUsed) {
        const elapsed = Date.now() - lastUsed.timestamp
        if (elapsed < mergedConfig.rotationInterval) {
          continue
        }
      }
    }

    eligibleAccounts.push(account)
  }

  // 如果轮换间隔导致没有可用账户，重置该用户的缓存再试
  if (eligibleAccounts.length === 0 && mergedConfig.rotationInterval > 0) {
    console.log(`[selectEmailAccount] No eligible accounts after rotation filter, resetting user cache`)

    // P0 修复：只清除当前用户的缓存，不影响其他用户
    for (const key of lastUsedCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        lastUsedCache.delete(key)
      }
    }

    // 重新过滤（不考虑轮换间隔）
    for (const account of accounts) {
      if (account.healthScore < mergedConfig.minHealthScore) {
        continue
      }
      if (!isDailyLimitOk(account)) {
        continue
      }
      eligibleAccounts.push(account)
    }
  }

  if (eligibleAccounts.length === 0) {
    console.warn(`[selectEmailAccount] No eligible accounts for user ${userId}`)
    return null
  }

  // 3. 使用加权评分排序（P0 修复：解决排序冲突）
  const healthWeight = mergedConfig.healthWeight / 100
  const loadWeight = mergedConfig.loadWeight / 100

  eligibleAccounts.sort((a, b) => {
    // 健康度评分 (0-100)
    const healthScoreA = a.healthScore
    const healthScoreB = b.healthScore

    // 负载评分 (0-1)，越低越好，所以用 1 减
    const loadScoreA = a.dailyLimit > 0 ? 1 - (a.dailySent / a.dailyLimit) : 0
    const loadScoreB = b.dailyLimit > 0 ? 1 - (b.dailySent / b.dailyLimit) : 0

    // 综合评分
    const scoreA = healthScoreA * healthWeight + loadScoreA * 100 * loadWeight
    const scoreB = healthScoreB * healthWeight + loadScoreB * 100 * loadWeight

    return scoreB - scoreA // 降序
  })

  const selectedAccount = eligibleAccounts[0]

  // 4. 更新缓存
  lastUsedCache.set(`${userId}:${selectedAccount.id}`, {
    accountId: selectedAccount.id,
    timestamp: Date.now(),
  })

  console.log(
    `[selectEmailAccount] Selected ${selectedAccount.email} ` +
    `(health: ${selectedAccount.healthScore}, ` +
    `sent: ${selectedAccount.dailySent}/${selectedAccount.dailyLimit})`
  )

  return selectedAccount.id
}

/**
 * 获取用户的最佳账户（用于 Campaign Launch）
 * 如果没有绑定账户，自动选择最佳可用账户
 *
 * @param userId 用户ID
 * @param emailAccountId 可选的指定账户ID
 * @returns EmailAccount ID 或 null
 */
export async function getAvailableAccount(
  userId: string,
  emailAccountId?: string | null
): Promise<string | null> {
  // 参数验证
  if (!userId) {
    console.error('[getAvailableAccount] userId is required')
    return null
  }

  // 如果指定了账户，验证其可用性
  if (emailAccountId) {
    const account = await prisma.emailAccount.findFirst({
      where: {
        id: emailAccountId,
        userId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        healthScore: true,
        dailySent: true,
        dailyLimit: true,
        lastResetAt: true,
      },
    })

    if (account) {
      // P2 修复：检查健康度
      if (account.healthScore < DEFAULT_CONFIG.minHealthScore) {
        console.warn(
          `[getAvailableAccount] Specified account ${emailAccountId} ` +
          `health score ${account.healthScore} < ${DEFAULT_CONFIG.minHealthScore}`
        )
        // 降级到自动选择
      } else if (!isDailyLimitOk(account)) {
        console.warn(`[getAvailableAccount] Specified account ${emailAccountId} reached daily limit`)
        // 降级到自动选择
      } else {
        return emailAccountId
      }
    } else {
      console.warn(`[getAvailableAccount] Specified account ${emailAccountId} not found or inactive`)
    }
  }

  // 自动选择最佳账户
  return selectEmailAccount(userId)
}

/**
 * 重置用户的账户轮换缓存
 * 在用户手动切换账户或配置变更时调用
 */
export function resetAccountRotationCache(userId?: string): void {
  if (userId) {
    // 只清除指定用户的缓存
    for (const key of lastUsedCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        lastUsedCache.delete(key)
      }
    }
  } else {
    // 清除所有缓存
    lastUsedCache.clear()
  }
}

/**
 * 获取账户轮换统计信息（用于调试和监控）
 */
export function getRotationStats(userId: string): {
  cachedAccounts: number
  lastUsed: { accountId: string; timestamp: number } | null
  cacheSize: number
} {
  const cachedAccounts: Array<{ accountId: string; timestamp: number }> = []

  for (const [key, value] of lastUsedCache.entries()) {
    if (key.startsWith(`${userId}:`)) {
      cachedAccounts.push(value)
    }
  }

  return {
    cachedAccounts: cachedAccounts.length,
    lastUsed: cachedAccounts.length > 0
      ? cachedAccounts.reduce((a, b) => a.timestamp > b.timestamp ? a : b)
      : null,
    cacheSize: lastUsedCache.size,
  }
}
