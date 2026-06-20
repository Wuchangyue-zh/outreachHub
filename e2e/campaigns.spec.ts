import { test, expect } from '@playwright/test'

test.describe('Campaigns Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' })
  })

  test('should show stat cards', async ({ page }) => {
    await expect(page.getByText('Total Sent')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Avg Open Rate')).toBeVisible()
    await expect(page.getByText('Avg Reply Rate')).toBeVisible()
    await expect(page.getByText('Active Campaigns')).toBeVisible()
  })

  test('should show search input', async ({ page }) => {
    await expect(page.getByPlaceholder('搜索任务名称...')).toBeVisible({ timeout: 10000 })
  })

  test('should show status filter', async ({ page }) => {
    const select = page.locator('select')
    await expect(select).toBeVisible({ timeout: 10000 })
    await expect(select).toContainText('All Status')
  })

  test('should show New Campaign button', async ({ page }) => {
    await expect(page.getByRole('link', { name: /New Campaign/ })).toBeVisible({ timeout: 10000 })
  })

  test('should display campaigns table', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
  })

  test('should display table column headers', async ({ page }) => {
    const headerRow = page.getByRole('table').locator('thead tr')
    await expect(headerRow.getByText('Campaign Name')).toBeVisible({ timeout: 10000 })
    await expect(headerRow.getByText('Audience')).toBeVisible()
    await expect(headerRow.getByText('Sent')).toBeVisible()
    await expect(headerRow.getByText('Open Rate')).toBeVisible()
    await expect(headerRow.getByText('Reply Rate')).toBeVisible()
  })

  test('should filter by status', async ({ page }) => {
    const select = page.locator('select')
    await select.selectOption('Draft')
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
