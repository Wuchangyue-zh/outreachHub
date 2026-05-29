import { prisma } from './prisma'
import { checkDailyLimit } from './email-account-mail'

/**
 * EmailAccount 选择策略配置
 */
interface AccountSelectionConfig {
  /** 优先使用健康度最高的账户 */
  preferHealthiest?: boolean
  /** 优先使用发送量最少的账户（负载均衡） */
  preferLeastSent?: boolean
  /** 跳过健康度低于此阈值的账户 */
  minHealthScore?: number
  /** 轮换间隔（毫秒），避免短时间内重复使用同一账户 */
  rotationInterval?: number
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AccountSelectionConfig = {
  preferHealthiest: true,
  preferLeastSent: true,
  minHealthScore: 50,
  rotationInterval: 60 * 1000, // 1 分钟
}

/**
 * 内存缓存：记录每个用户最近使用的账户和时间
 */
const lastUsedCache = new Map<string, { accountId: string; timestamp: number }>()

/**
 * 选择最佳可用的 EmailAccount
 *
 * 轮换策略：
 * 1. 过滤掉不活跃、达到日限额、健康度低于阈值的账户
 * 2. 如果配置了轮换间隔，跳过最近使用过的账户
 * 3. 按健康度降序、当日发送量升序排序
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
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

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
    orderBy: [
      { healthScore: 'desc' },
      { dailySent: 'asc' },
    ],
  })

  if (accounts.length === 0) {
    console.warn(`[selectEmailAccount] No active accounts found for user ${userId}`)
    return null
  }

  // 2. 过滤账户
  const eligibleAccounts: typeof accounts = []

  for (const account of accounts) {
    // 检查健康度阈值
    if (mergedConfig.minHealthScore && account.healthScore < mergedConfig.minHealthScore) {
      console.log(`[selectEmailAccount] Skipping ${account.email}: health score ${account.healthScore} < ${mergedConfig.minHealthScore}`)
      continue
    }

    // 检查日限额
    const canSend = await checkDailyLimit(account.id)
    if (!canSend) {
      console.log(`[selectEmailAccount] Skipping ${account.email}: daily limit reached`)
      continue
    }

    // 检查轮换间隔
    if (mergedConfig.rotationInterval) {
      const lastUsed = lastUsedCache.get(`${userId}:${account.id}`)
      if (lastUsed) {
        const elapsed = Date.now() - lastUsed.timestamp
        if (elapsed < mergedConfig.rotationInterval) {
          console.log(`[selectEmailAccount] Skipping ${account.email}: used ${Math.round(elapsed / 1000)}s ago (< ${mergedConfig.rotationInterval / 1000}s)`)
          continue
        }
      }
    }

    eligibleAccounts.push(account)
  }

  if (eligibleAccounts.length === 0) {
    // 如果轮换间隔导致没有可用账户，重置缓存再试
    if (mergedConfig.rotationInterval) {
      console.log(`[selectEmailAccount] No eligible accounts after rotation filter, resetting cache`)
      lastUsedCache.clear()

      // 重新过滤（不考虑轮换间隔）
      for (const account of accounts) {
        if (mergedConfig.minHealthScore && account.healthScore < mergedConfig.minHealthScore) {
          continue
        }
        const canSend = await checkDailyLimit(account.id)
        if (canSend) {
          eligibleAccounts.push(account)
        }
      }
    }

    if (eligibleAccounts.length === 0) {
      console.warn(`[selectEmailAccount] No eligible accounts for user ${userId}`)
      return null
    }
  }

  // 3. 选择最佳账户
  let selectedAccount = eligibleAccounts[0]

  if (mergedConfig.preferLeastSent && eligibleAccounts.length > 1) {
    // 按发送量排序，选择发送最少的
    eligibleAccounts.sort((a, b) => a.dailySent - b.dailySent)
    selectedAccount = eligibleAccounts[0]
  }

  // 4. 更新缓存
  lastUsedCache.set(`${userId}:${selectedAccount.id}`, {
    accountId: selectedAccount.id,
    timestamp: Date.now(),
  })

  console.log(`[selectEmailAccount] Selected ${selectedAccount.email} (health: ${selectedAccount.healthScore}, sent: ${selectedAccount.dailySent}/${selectedAccount.dailyLimit})`)

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
  // 如果指定了账户，验证其可用性
  if (emailAccountId) {
    const account = await prisma.emailAccount.findFirst({
      where: {
        id: emailAccountId,
        userId,
        isActive: true,
      },
    })

    if (account) {
      const canSend = await checkDailyLimit(emailAccountId)
      if (canSend) {
        return emailAccountId
      }
      console.warn(`[getAvailableAccount] Specified account ${emailAccountId} reached daily limit`)
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
 * 获取账户轮换统计信息
 */
export function getRotationStats(userId: string): {
  cachedAccounts: number
  lastUsed: { accountId: string; timestamp: number } | null
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
  }
}
