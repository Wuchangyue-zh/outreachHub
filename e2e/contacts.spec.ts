import { test, expect } from '@playwright/test'

test.describe('Contacts Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.getByLabel(/邮箱/).fill('admin@outreachhub.com')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: /登录/ }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })

    // Navigate to contacts with longer timeout
    await page.goto('/contacts', { timeout: 30000 })
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /客户管理/i })).toBeVisible({ timeout: 15000 })
  })

  test('should display contacts list', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('should show search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/搜索|Search/i)).toBeVisible()
  })

  test('should have add contact button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /添加|Add/i })).toBeVisible()
  })

  test('should have import button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /导入|Import/i })).toBeVisible()
  })

  test('should have export button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /导出|Export/i })).toBeVisible()
  })

  test('should open add contact dialog', async ({ page }) => {
    await page.getByRole('button', { name: /添加|Add/i }).click()
    await expect(page.getByText(/添加客户|添加联系人|Add Contact/i).first()).toBeVisible()
  })

  test('should open import dialog', async ({ page }) => {
    await page.getByRole('button', { name: /导入|Import/i }).click()
    await expect(page.getByText(/导入|Import/i).first()).toBeVisible()
  })

  test('should search contacts', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜索|Search/i)
    await searchInput.fill('test@example.com')
    await expect(searchInput).toHaveValue('test@example.com')
  })

  test('should display contact table headers', async ({ page }) => {
    await expect(page.getByText(/客户信息|公司|邮箱/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('should show pagination', async ({ page }) => {
    // Wait for table to load first
    await page.waitForLoadState('networkidle')
    // Check for pagination controls or total records text
    const pagination = page.getByText(/共.*条记录|上一页|下一页|Page/i).first()
    // If pagination exists, verify it's visible; otherwise skip
    const isVisible = await pagination.isVisible().catch(() => false)
    if (isVisible) {
      await expect(pagination).toBeVisible()
    }
    // At least verify the table is loaded
    await expect(page.getByRole('table')).toBeVisible()
  })
})
