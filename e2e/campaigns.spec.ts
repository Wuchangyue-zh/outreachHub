import { test, expect } from '@playwright/test'

test.describe('Campaigns Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' })
  })

  test('should show stat cards', async ({ page }) => {
    await expect(page.getByText('总发送邮件')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('平均打开率')).toBeVisible()
    await expect(page.getByText('平均回复率')).toBeVisible()
    await expect(page.getByText('进行中活动')).toBeVisible()
  })

  test('should show search input', async ({ page }) => {
    await expect(page.getByPlaceholder('搜索任务名称...')).toBeVisible({ timeout: 10000 })
  })

  test('should show status filter', async ({ page }) => {
    const select = page.locator('select')
    await expect(select).toBeVisible({ timeout: 10000 })
    await expect(select).toContainText('全部状态')
  })

  test('should show New Campaign button', async ({ page }) => {
    await expect(page.getByRole('link', { name: /创建活动/ })).toBeVisible({ timeout: 10000 })
  })

  test('should display campaigns table', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
  })

  test('should display table column headers', async ({ page }) => {
    const headerRow = page.getByRole('table').locator('thead tr')
    await expect(headerRow.getByText('活动名称')).toBeVisible({ timeout: 10000 })
    await expect(headerRow.getByText('受众')).toBeVisible()
    await expect(headerRow.getByText('已发送')).toBeVisible()
    await expect(headerRow.getByText('打开率')).toBeVisible()
    await expect(headerRow.getByText('回复率')).toBeVisible()
  })

  test('should filter by status', async ({ page }) => {
    const select = page.locator('select')
    await select.selectOption('DRAFT')
    await expect(select).toHaveValue('DRAFT')
  })

  test('should navigate to new campaign page', async ({ page }) => {
    await page.goto('/campaigns/new', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/campaigns\/new/)
    await expect(page.getByText('基础信息').first()).toBeVisible({ timeout: 10000 })
  })

  test('should search campaigns by name', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜索任务名称...')
    await searchInput.fill('test campaign')
    await expect(searchInput).toHaveValue('test campaign')
  })
})

test.describe('New Campaign Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/campaigns/new', { waitUntil: 'domcontentloaded' })
  })

  test('should display step 1 basic info', async ({ page }) => {
    await expect(page.getByText('基础信息').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show campaign name input', async ({ page }) => {
    await expect(page.getByPlaceholder(/例：2024 Q4/)).toBeVisible({ timeout: 10000 })
  })

  test('should show campaign type options', async ({ page }) => {
    await expect(page.getByText('单次发送')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('多步序列')).toBeVisible()
    await expect(page.getByText('A/B 测试')).toBeVisible()
  })

  test('should show next step button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /下一步/ })).toBeVisible({ timeout: 10000 })
  })

  test('should fill campaign name', async ({ page }) => {
    const ts = Date.now()
    const nameInput = page.getByPlaceholder(/例：2024 Q4/)
    await nameInput.fill(`E2E Campaign ${ts}`)
    await expect(nameInput).toHaveValue(`E2E Campaign ${ts}`)
  })
})
