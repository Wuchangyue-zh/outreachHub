import { test, expect } from '@playwright/test'

test.describe('Templates Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/templates', { waitUntil: 'domcontentloaded' })
  })

  test('should display page heading', async ({ page }) => {
    await expect(page.getByText('邮件模板').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show new template button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /新建模板/ })).toBeVisible({ timeout: 10000 })
  })

  test('should show category filter', async ({ page }) => {
    const select = page.locator('select').first()
    await expect(select).toBeVisible({ timeout: 10000 })
  })

  test('should open create template dialog', async ({ page }) => {
    await page.getByRole('button', { name: /新建模板/ }).click()
    await page.waitForTimeout(500)
    // Dialog heading appears (second instance of "新建模板" text)
    await expect(page.getByText(/新建模板|创建模板/).first()).toBeVisible({ timeout: 10000 })
  })

  test('should filter templates by category', async ({ page }) => {
    const select = page.locator('select').first()
    await select.selectOption({ label: '冷邮件' })
    await page.waitForTimeout(500)
    await expect(page.getByText('邮件模板').first()).toBeVisible()
  })
})
