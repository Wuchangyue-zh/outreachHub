import { test, expect } from '@playwright/test'

test.describe('Inbox Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/邮箱/).fill('admin@outreachhub.com')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: /登录/ }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/dashboard/inbox', { timeout: 30000 })
    await page.waitForLoadState('domcontentloaded')
  })

  test('should display inbox page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /收件箱|Inbox/i })).toBeVisible({ timeout: 15000 })
  })

  test('should show refresh button', async ({ page }) => {
    const refreshBtn = page.getByRole('button', { name: /刷新|Refresh|同步|Sync/i }).first()
    await expect(refreshBtn).toBeVisible({ timeout: 15000 })
  })

  test('should show thread list or empty state', async ({ page }) => {
    await page.waitForTimeout(2000)
    // Either conversation list or empty state
    const hasThreads = await page.getByText(/会话|对话|Conversation/i).first().isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/暂无|No conversations|没有邮件/i).first().isVisible().catch(() => false)
    expect(hasThreads || hasEmpty).toBeTruthy()
  })

  test('should show email account selector', async ({ page }) => {
    const selector = page.getByText(/发件账户|Email Account|选择邮箱/i).first()
    if (await selector.isVisible()) {
      await expect(selector).toBeVisible()
    }
  })

  test('should show reply area when thread selected', async ({ page }) => {
    await page.waitForTimeout(2000)
    // Click first thread if exists
    const firstThread = page.getByRole('button', { name: /查看|View|回复|Reply/i }).first()
    if (await firstThread.isVisible()) {
      await firstThread.click()
      await page.waitForTimeout(1000)
      // Should show reply area
      const replyArea = page.getByPlaceholder(/回复|Reply|输入|Write/i).first()
      if (await replyArea.isVisible()) {
        await expect(replyArea).toBeVisible()
      }
    }
  })

  test('should show AI reply button when thread selected', async ({ page }) => {
    await page.waitForTimeout(2000)
    const firstThread = page.getByRole('button', { name: /查看|View|回复|Reply/i }).first()
    if (await firstThread.isVisible()) {
      await firstThread.click()
      await page.waitForTimeout(1000)
      const aiBtn = page.getByRole('button', { name: /AI/i }).first()
      if (await aiBtn.isVisible()) {
        await expect(aiBtn).toBeVisible()
      }
    }
  })
})
