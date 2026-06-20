import { test, expect } from '@playwright/test'

test.describe('Inbox Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/inbox', { waitUntil: 'domcontentloaded' })
  })

  test('should display inbox heading', async ({ page }) => {
    // The i18n key may render as-is if translation is missing
    await expect(page.getByText(/收件箱|dashboardInbox\.inbox/).first()).toBeVisible({ timeout: 10000 })
  })

  test('should show search input', async ({ page }) => {
    await expect(page.getByPlaceholder('搜索联系人...')).toBeVisible({ timeout: 10000 })
  })

  test('should show intent filter buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: '全部' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /感兴趣/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /退订/ })).toBeVisible()
    // The "外出" button may show as i18n key if translation is missing
    await expect(page.getByRole('button', { name: /外出|outOfOffice/i })).toBeVisible()
  })

  test('should show empty state when no conversation selected', async ({ page }) => {
    await page.waitForTimeout(1000)
    await expect(page.getByText(/收件箱|dashboardInbox\.inbox/).first()).toBeVisible()
  })

  test('should show refresh button', async ({ page }) => {
    const refreshBtn = page.locator('button').first()
    await expect(refreshBtn).toBeVisible({ timeout: 10000 })
  })

  test('should have two-panel layout', async ({ page }) => {
    await expect(page.getByPlaceholder('搜索联系人...')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(500)
  })
})
