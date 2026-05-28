import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.getByLabel(/邮箱/).fill('admin@outreachhub.com')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: /登录/ }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    await page.waitForLoadState('networkidle')
  })

  test('should display dashboard page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /仪表盘/i })).toBeVisible()
  })

  test('should show statistics cards', async ({ page }) => {
    // Check for stats cards - use actual text from component
    await expect(page.getByText(/总客户数|公司库|已发送邮件/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('should have navigation sidebar', async ({ page }) => {
    await expect(page.getByRole('link', { name: '客户管理', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: '公司库', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: '邮件营销', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: '邮件模板', exact: true })).toBeVisible()
  })

  test('should navigate to contacts page', async ({ page }) => {
    await page.getByRole('link', { name: /客户管理/i }).click()
    await expect(page).toHaveURL(/\/contacts/)
    await expect(page.getByRole('heading', { name: /客户管理/i })).toBeVisible()
  })

  test('should navigate to campaigns page', async ({ page }) => {
    await page.getByRole('link', { name: /邮件营销/i }).click()
    await expect(page).toHaveURL(/\/campaigns/)
    await expect(page.getByRole('heading', { name: /邮件营销/i })).toBeVisible()
  })

  test('should navigate to templates page', async ({ page }) => {
    const link = page.getByRole('link', { name: '邮件模板', exact: true })
    await link.click()
    await page.waitForURL(/\/templates/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/templates/)
  })

  test('should navigate to companies page', async ({ page }) => {
    await page.getByRole('link', { name: '公司库', exact: true }).click()
    await page.waitForURL(/\/companies/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/companies/)
  })
})
