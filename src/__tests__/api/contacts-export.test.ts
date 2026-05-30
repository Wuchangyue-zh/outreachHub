/**
 * K4: API 集成测试 — 联系人导出 + 退订 + DNS 记录
 * 这些测试验证模块导入和函数签名正确性（非 HTTP 集成）
 */

describe('API module imports', () => {
  it('should import dns-verify module', async () => {
    const mod = await import('@/lib/dns-verify')
    expect(typeof mod.verifySPF).toBe('function')
    expect(typeof mod.verifyDMARC).toBe('function')
    expect(typeof mod.verifyDKIM).toBe('function')
    expect(typeof mod.verifyAllDnsRecords).toBe('function')
  })

  it('should import warmup module', async () => {
    const mod = await import('@/lib/warmup')
    expect(typeof mod.getWarmupDailyLimit).toBe('function')
    expect(typeof mod.isWarmupComplete).toBe('function')
    expect(typeof mod.advanceWarmupDay).toBe('function')
  })

  it('should import storage module with all exports', async () => {
    const mod = await import('@/lib/storage')
    expect(typeof mod.uploadFile).toBe('function')
    expect(typeof mod.deleteFile).toBe('function')
    expect(typeof mod.fetchFileBuffer).toBe('function')
    expect(typeof mod.resolvePublicUrl).toBe('function')
    expect(typeof mod.generateFilename).toBe('function')
    expect(typeof mod.validateFile).toBe('function')
  })

  it('should import email-html module', async () => {
    const mod = await import('@/lib/email-html')
    expect(typeof mod.resolvePublicUrls).toBe('function')
  })

  it('should import plan-limits module', async () => {
    const mod = await import('@/lib/plan-limits')
    expect(typeof mod.getTenantLimits).toBe('function')
    expect(typeof mod.getTenantUsage).toBe('function')
    expect(typeof mod.checkContactLimit).toBe('function')
    expect(typeof mod.checkDailyEmailLimit).toBe('function')
    expect(typeof mod.syncTenantLimits).toBe('function')
  })

  it('should import email-queue module with getFailedJobs', async () => {
    const mod = await import('@/lib/email-queue')
    expect(typeof mod.addEmailJob).toBe('function')
    expect(typeof mod.addBulkEmailJobs).toBe('function')
    expect(typeof mod.getQueueStats).toBe('function')
    expect(typeof mod.getFailedJobs).toBe('function')
    expect(typeof mod.retryFailedJobs).toBe('function')
  })

  it('should import cron-handlers with retry-failed support', async () => {
    const mod = await import('@/lib/cron-handlers')
    expect(typeof mod.runCronHandler).toBe('function')
  })
})

describe('DNS verification functions', () => {
  it('verifySPF should return result structure', async () => {
    const { verifySPF } = await import('@/lib/dns-verify')
    const result = await verifySPF('nonexistent-domain-xyz123.test')
    expect(result).toHaveProperty('record', 'SPF')
    expect(result).toHaveProperty('host')
    expect(result).toHaveProperty('found')
    expect(result).toHaveProperty('valid')
    expect(result).toHaveProperty('message')
  })

  it('verifyDMARC should return result structure', async () => {
    const { verifyDMARC } = await import('@/lib/dns-verify')
    const result = await verifyDMARC('nonexistent-domain-xyz123.test')
    expect(result).toHaveProperty('record', 'DMARC')
    expect(result.found).toBe(false)
  })

  it('inferDkimSelector should map known SMTP hosts', async () => {
    const { inferDkimSelector } = await import('@/lib/dns-verify')
    expect(inferDkimSelector('smtp.gmail.com')).toBe('google')
    expect(inferDkimSelector('smtp.office365.com')).toBe('selector1')
    expect(inferDkimSelector('smtp.example.com')).toBe('default')
  })
})
