import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.getByLabel(/邮箱/).fill('admin@outreachhub.com')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: /登录/ }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('should display dashboard page', async ({ page }) => {
    await expect(page.getByText(/仪表盘|Dashboard/i)).toBeVisible()
  })

  test('should show statistics cards', async ({ page }) => {
    // Check for stats cards
    await expect(page.getByText(/总联系人|Total Contacts/i)).toBeVisible()
    await expect(page.getByText(/邮件活动|Campaigns/i)).toBeVisible()
    await expect(page.getByText(/打开率|Open Rate/i)).toBeVisible()
  })

  test('should have navigation sidebar', async ({ page }) => {
    await expect(page.getByRole('link', { name: /联系人|Contacts/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /公司|Companies/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /活动|Campaigns/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /模板|Templates/i })).toBeVisible()
  })

  test('should navigate to contacts page', async ({ page }) => {
    await page.getByRole('link', { name: /联系人|Contacts/i }).click()
    await expect(page).toHaveURL(/\/contacts/)
    await expect(page.getByText(/联系人管理|Contacts/i)).toBeVisible()
  })

  test('should navigate to campaigns page', async ({ page }) => {
    await page.getByRole('link', { name: /活动|Campaigns/i }).click()
    await expect(page).toHaveURL(/\/campaigns/)
    await expect(page.getByText(/邮件营销|Campaigns/i)).toBeVisible()
  })

  test('should navigate to templates page', async ({ page }) => {
    await page.getByRole('link', { name: /模板|Templates/i }).click()
    await expect(page).toHaveURL(/\/templates/)
    await expect(page.getByText(/邮件模板|Templates/i)).toBeVisible()
  })

  test('should navigate to companies page', async ({ page }) => {
    await page.getByRole('link', { name: /公司|Companies/i }).click()
    await expect(page).toHaveURL(/\/companies/)
    await expect(page.getByText(/公司管理|Companies/i)).toBeVisible()
  })
})
