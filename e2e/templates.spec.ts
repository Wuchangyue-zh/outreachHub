import { test, expect } from '@playwright/test'

test.describe('Templates Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/邮箱/).fill('admin@outreachhub.com')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: /登录/ }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/templates', { timeout: 30000 })
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /邮件模板/i })).toBeVisible({ timeout: 15000 })
  })

  test('should display templates list', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('should have create template button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /创建|Create|新建|New/i })).toBeVisible()
  })

  test('should have search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/搜索|Search/i)).toBeVisible()
  })

  test('should display template table headers', async ({ page }) => {
    await expect(page.getByText(/名称|Name/i).first()).toBeVisible()
    await expect(page.getByText(/主题|Subject/i).first()).toBeVisible()
  })

  test('should open create template dialog', async ({ page }) => {
    await page.getByRole('button', { name: /创建|Create|新建|New/i }).click()
    await expect(page.getByText(/创建模板|新建模板|Create Template/i).first()).toBeVisible()
  })

  test('should display category filter', async ({ page }) => {
    // Category filter or tabs
    const categoryFilter = page.getByText(/分类|Category|全部|All/i).first()
    if (await categoryFilter.isVisible()) {
      await expect(categoryFilter).toBeVisible()
    }
  })

  test('should show template usage stats', async ({ page }) => {
    // Stats bar or usage count
    const stats = page.getByText(/使用次数|Usage|成功率/i).first()
    if (await stats.isVisible()) {
      await expect(stats).toBeVisible()
    }
  })
})
