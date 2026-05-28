import { test, expect } from '@playwright/test'

test.describe('Contacts Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.getByLabel(/邮箱/).fill('admin@outreachhub.com')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: /登录/ }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // Navigate to contacts
    await page.goto('/contacts')
    await expect(page.getByText(/联系人管理|Contacts/i)).toBeVisible()
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
    await expect(page.getByText(/添加联系人|Add Contact/i)).toBeVisible()
  })

  test('should open import dialog', async ({ page }) => {
    await page.getByRole('button', { name: /导入|Import/i }).click()
    await expect(page.getByText(/导入|Import/i)).toBeVisible()
  })

  test('should search contacts', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜索|Search/i)
    await searchInput.fill('test@example.com')
    await expect(searchInput).toHaveValue('test@example.com')
  })

  test('should display contact table headers', async ({ page }) => {
    await expect(page.getByText(/姓名|Name/i)).toBeVisible()
    await expect(page.getByText(/邮箱|Email/i)).toBeVisible()
    await expect(page.getByText(/公司|Company/i)).toBeVisible()
    await expect(page.getByText(/状态|Status/i)).toBeVisible()
  })

  test('should show pagination', async ({ page }) => {
    // Check for pagination controls
    const pagination = page.getByText(/页|Page/i).first()
    await expect(pagination).toBeVisible()
  })
})
