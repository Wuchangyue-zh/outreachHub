/**
 * 环境变量校验与访问。生产环境启动时强制校验关键配置。
 */

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test' || process.env.DISABLE_ENV_VALIDATION === 'true'

const PRODUCTION_REQUIRED = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'ENCRYPTION_KEY',
  'CRON_SECRET',
] as const

const PRODUCTION_RECOMMENDED = [
  'REDIS_URL',
  'APP_URL',
  'NEXTAUTH_URL',
] as const

let validated = false

export function validateEnv(): void {
  if (validated || isTest) return
  validated = true

  const missing: string[] = []
  const warnings: string[] = []

  if (isProduction) {
    for (const key of PRODUCTION_REQUIRED) {
      if (!process.env[key]?.trim()) missing.push(key)
    }
    for (const key of PRODUCTION_RECOMMENDED) {
      if (!process.env[key]?.trim()) warnings.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[Env] Missing required production environment variables: ${missing.join(', ')}`
    )
  }

  if (
    isProduction &&
    process.env.ENCRYPTION_KEY &&
    !/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY)
  ) {
    throw new Error(
      '[Env] ENCRYPTION_KEY must be a 64-character hex string in production'
    )
  }

  for (const key of warnings) {
    console.warn(`[Env] Recommended variable not set: ${key}`)
  }

  if (isProduction && !process.env.DATABASE_URL?.includes('pooler') &&
      !process.env.DATABASE_URL?.includes('pgbouncer') &&
      !process.env.DATABASE_URL?.includes('-pooler')) {
    console.warn(
      '[Env] DATABASE_URL does not appear to use connection pooling. ' +
      'Use Neon/Supabase pooler URL for serverless deployments.'
    )
  }
}

let devSecretWarned = false

export function getJwtSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (secret) return secret
  if (isProduction) {
    throw new Error('NEXTAUTH_SECRET is required in production')
  }
  if (!devSecretWarned) {
    console.warn('[Env] NEXTAUTH_SECRET not set — using dev fallback. Set NEXTAUTH_SECRET in .env for consistent JWT across restarts.')
    devSecretWarned = true
  }
  return 'dev-only-secret-not-for-production'
}

export function isProductionEnv(): boolean {
  return isProduction
}

export function getWorkerConcurrency(defaultValue = 5): number {
  const val = parseInt(process.env.EMAIL_WORKER_CONCURRENCY || '', 10)
  return Number.isFinite(val) && val > 0 ? val : defaultValue
}

export function getWorkerRateLimit(): { max: number; duration: number } {
  const max = parseInt(process.env.EMAIL_WORKER_RATE_MAX || '100', 10)
  const duration = parseInt(process.env.EMAIL_WORKER_RATE_DURATION_MS || '60000', 10)
  return { max, duration }
}

export function getPoolReleaseDays(): number {
  const raw = parseInt(process.env.POOL_AUTO_RELEASE_DAYS || '30', 10)
  if (!Number.isFinite(raw)) return 30
  return Math.max(1, Math.min(365, raw))
}

export function getStorageBackend(): 'blob' | 's3' | 'local' {
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob'
  if (
    process.env.S3_ACCESS_KEY &&
    process.env.S3_SECRET_KEY &&
    process.env.S3_BUCKET
  ) {
    return 's3'
  }
  return 'local'
}
