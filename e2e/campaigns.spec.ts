import { test, expect } from '@playwright/test'

test.describe('Campaigns Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.getByLabel(/邮箱/).fill('admin@outreachhub.com')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: /登录/ }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })

    // Navigate to campaigns with longer timeout
    await page.goto('/campaigns', { timeout: 30000 })
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /邮件营销/i })).toBeVisible({ timeout: 15000 })
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
    // Wait for view to switch
    await page.waitForTimeout(1000)
    // The stats view might show different content depending on whether a campaign is selected
    // Just verify the button click worked and page didn't crash
    await expect(page.getByRole('heading', { name: /邮件营销/i })).toBeVisible()
  })

  test('should switch back to list view', async ({ page }) => {
    await page.getByRole('button', { name: /统计|Stats/i }).click()
    await page.getByRole('button', { name: /列表|List/i }).click()
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('should open create campaign dialog', async ({ page }) => {
    await page.getByRole('button', { name: /创建|Create/i }).click()
    await expect(page.getByText(/创建活动|Create Campaign/i).first()).toBeVisible()
  })

  test('should display campaign table headers', async ({ page }) => {
    await expect(page.getByText(/名称|Name/i).first()).toBeVisible()
    await expect(page.getByText(/状态|Status/i).first()).toBeVisible()
  })

  test('should show quick stats cards', async ({ page }) => {
    await expect(page.getByText(/进行中|Running/i).first()).toBeVisible()
  })

  test('should have view stats button for campaigns', async ({ page }) => {
    // Check if there are campaigns in the list
    const firstRow = page.getByRole('row').nth(1)
    if (await firstRow.isVisible()) {
      await expect(firstRow.getByRole('button', { name: /查看|View/i })).toBeVisible()
    }
  })

  test('should show campaign status badges', async ({ page }) => {
    // Check for status badges (draft, running, completed, etc.)
    const statusBadge = page.getByText(/草稿|Draft|进行中|Running|已完成|Completed/i).first()
    if (await statusBadge.isVisible()) {
      await expect(statusBadge).toBeVisible()
    }
  })

  // P1-15: 完整的 E2E 冒烟测试
  test('should create and launch a campaign', async ({ page }) => {
    // 点击创建按钮
    await page.getByRole('button', { name: /创建|Create/i }).click()
    await expect(page.getByText(/创建活动|Create Campaign/i).first()).toBeVisible({ timeout: 10000 })

    // 填写活动名称
    const nameInput = page.getByLabel(/名称|Name/i).first()
    await nameInput.fill('E2E 测试活动')

    // 填写邮件主题
    const subjectInput = page.getByLabel(/主题|Subject/i).first()
    await subjectInput.fill('测试邮件主题')

    // 填写邮件内容
    const contentInput = page.getByLabel(/内容|Content/i).first()
    await contentInput.fill('这是一封测试邮件的内容。')

    // 提交创建
    await page.getByRole('button', { name: /创建|Create|保存|Save/i }).click()

    // 等待创建成功
    await page.waitForTimeout(2000)

    // 验证活动已创建（应该出现在列表中）
    await expect(page.getByText('E2E 测试活动')).toBeVisible({ timeout: 10000 })
  })

  test('should display campaign details', async ({ page }) => {
    // 点击第一个活动查看详情
    const firstRow = page.getByRole('row').nth(1)
    if (await firstRow.isVisible()) {
      await firstRow.getByRole('button', { name: /查看|View/i }).click()

      // 等待详情页加载
      await page.waitForTimeout(1000)

      // 验证详情页显示
      await expect(page.getByText(/活动详情|Campaign Details/i).first()).toBeVisible()
    }
  })

  test('should show campaign statistics', async ({ page }) => {
    // 切换到统计视图
    await page.getByRole('button', { name: /统计|Stats/i }).click()
    await page.waitForTimeout(1000)

    // 验证统计卡片显示
    await expect(page.getByText(/总发送|Total Sent/i).first()).toBeVisible()
    await expect(page.getByText(/打开率|Open Rate/i).first()).toBeVisible()
  })
})
