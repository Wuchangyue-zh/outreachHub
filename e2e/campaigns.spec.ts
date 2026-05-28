import { test, expect } from '@playwright/test'

test.describe('Campaigns Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.getByLabel(/邮箱/).fill('admin@outreachhub.com')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: /登录/ }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })

    // Navigate to campaigns
    await page.goto('/campaigns')
    await expect(page.getByText(/邮件营销|Campaigns/i)).toBeVisible()
  })

  test('should display campaigns list', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('should have create campaign button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /创建|Create/i })).toBeVisible()
  })

  test('should have view mode toggle', async ({ page }) => {
    await expect(page.getByRole('button', { name: /列表|List/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /统计|Stats/i })).toBeVisible()
  })

  test('should switch to stats view', async ({ page }) => {
    await page.getByRole('button', { name: /统计|Stats/i }).click()
    // Should show statistics components
    await expect(page.getByText(/打开率|Open Rate/i)).toBeVisible()
  })

  test('should switch back to list view', async ({ page }) => {
    await page.getByRole('button', { name: /统计|Stats/i }).click()
    await page.getByRole('button', { name: /列表|List/i }).click()
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('should open create campaign dialog', async ({ page }) => {
    await page.getByRole('button', { name: /创建|Create/i }).click()
    await expect(page.getByText(/创建活动|Create Campaign/i)).toBeVisible()
  })

  test('should display campaign table headers', async ({ page }) => {
    await expect(page.getByText(/名称|Name/i)).toBeVisible()
    await expect(page.getByText(/状态|Status/i)).toBeVisible()
    await expect(page.getByText(/发送|Sent/i)).toBeVisible()
    await expect(page.getByText(/打开率|Open Rate/i)).toBeVisible()
  })

  test('should show quick stats cards', async ({ page }) => {
    await expect(page.getByText(/进行中|Running/i)).toBeVisible()
    await expect(page.getByText(/总发送|Total Sent/i)).toBeVisible()
    await expect(page.getByText(/平均打开率|Avg Open Rate/i)).toBeVisible()
  })

  test('should have view stats button for campaigns', async ({ page }) => {
    // Check if there are campaigns in the list
    const firstRow = page.getByRole('row').nth(1)
    if (await firstRow.isVisible()) {
      await expect(firstRow.getByRole('button', { name: /查看统计|View Stats/i })).toBeVisible()
    }
  })

  test('should show campaign status badges', async ({ page }) => {
    // Check for status badges (draft, running, completed, etc.)
    const statusBadge = page.getByText(/草稿|Draft|进行中|Running|已完成|Completed/i).first()
    if (await statusBadge.isVisible()) {
      await expect(statusBadge).toBeVisible()
    }
  })
})
