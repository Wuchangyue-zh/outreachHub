import { test, expect } from '@playwright/test'

test.describe('Prospecting Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/prospecting', { waitUntil: 'domcontentloaded' })
  })

  test('should display page heading', async ({ page }) => {
    await expect(page.getByText('智能拓客').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show tab buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /RocketReach 搜索/ })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /创建拓客任务/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /任务列表/ })).toBeVisible()
  })

  test('should show search form fields', async ({ page }) => {
    await expect(page.getByPlaceholder(/例如：SaaS/)).toBeVisible({ timeout: 10000 })
  })

  test('should show search button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /搜索/ }).first()).toBeVisible({ timeout: 10000 })
  })

  test('should show search mode toggle', async ({ page }) => {
    await expect(page.getByRole('button', { name: /搜公司/ })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /搜联系人/ })).toBeVisible()
  })

  test('should switch to search contacts mode', async ({ page }) => {
    await page.getByRole('button', { name: /搜联系人/ }).click()
    await expect(page.getByPlaceholder(/例如：CTO/)).toBeVisible({ timeout: 10000 })
  })

  test('should switch to task creation tab', async ({ page }) => {
    await page.getByRole('button', { name: /创建拓客任务/ }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('智能拓客').first()).toBeVisible()
  })

  test('should switch to task list tab', async ({ page }) => {
    await page.getByRole('button', { name: /任务列表/ }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('智能拓客').first()).toBeVisible()
  })

  test('should fill search and submit', async ({ page }) => {
    await page.getByPlaceholder(/例如：SaaS/).fill('software')
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.waitForTimeout(2000)
    await expect(page.getByText('智能拓客').first()).toBeVisible()
  })
})
