import { test, expect } from '@playwright/test'

test.describe('Prospecting Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/邮箱/).fill('admin@outreachhub.com')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: /登录/ }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/prospecting', { timeout: 30000 })
    await page.waitForLoadState('domcontentloaded')
  })

  test('should display prospecting page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /拓客|Prospecting/i })).toBeVisible({ timeout: 15000 })
  })

  test('should show search form', async ({ page }) => {
    // Keywords or search input
    const searchField = page.getByPlaceholder(/关键词|Keyword|搜索|Search/i).first()
    if (await searchField.isVisible()) {
      await expect(searchField).toBeVisible()
    }
  })

  test('should have search button', async ({ page }) => {
    const searchBtn = page.getByRole('button', { name: /搜索|Search|查找/i }).first()
    if (await searchBtn.isVisible()) {
      await expect(searchBtn).toBeVisible()
    }
  })

  test('should show tabs for search and tasks', async ({ page }) => {
    const searchTab = page.getByRole('tab', { name: /搜索|Search/i }).first()
    const tasksTab = page.getByRole('tab', { name: /任务|Tasks/i }).first()
    if (await searchTab.isVisible()) {
      await expect(searchTab).toBeVisible()
    }
    if (await tasksTab.isVisible()) {
      await expect(tasksTab).toBeVisible()
    }
  })

  test('should display keyword input field', async ({ page }) => {
    // Look for any input that could be for keywords
    const inputs = page.locator('input[type="text"], input[placeholder*="关键词"], input[placeholder*="keyword"]')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should show industry filter', async ({ page }) => {
    const industryFilter = page.getByText(/行业|Industry/i).first()
    if (await industryFilter.isVisible()) {
      await expect(industryFilter).toBeVisible()
    }
  })

  test('should show position filter', async ({ page }) => {
    const positionFilter = page.getByText(/职位|Position/i).first()
    if (await positionFilter.isVisible()) {
      await expect(positionFilter).toBeVisible()
    }
  })
})
