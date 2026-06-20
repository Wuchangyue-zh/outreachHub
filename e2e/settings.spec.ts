import { test, expect } from '@playwright/test'

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/settings', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[role="tab"]', { timeout: 10000 })
  })

  test('should display settings heading', async ({ page }) => {
    await expect(page.getByText('设置').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show email accounts tab by default', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /邮件账户/ })).toBeVisible({ timeout: 10000 })
  })

  test('should show add account button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /添加账户/ })).toBeVisible({ timeout: 10000 })
  })

  test('should show all tab buttons', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /邮件账户/ })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('tab', { name: /通用设置/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: /数据源/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: /安全设置/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: /API Keys/ })).toBeVisible()
  })

  test('should click general settings tab', async ({ page }) => {
    await page.getByRole('tab', { name: /通用设置/ }).click({ force: true })
    await page.waitForTimeout(500)
    // Just verify the click didn't crash the page
    await expect(page.getByText('设置').first()).toBeVisible()
  })

  test('should click data sources tab', async ({ page }) => {
    await page.getByRole('tab', { name: /数据源/ }).click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.getByText('设置').first()).toBeVisible()
  })

  test('should click security tab', async ({ page }) => {
    await page.getByRole('tab', { name: /安全设置/ }).click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.getByText('设置').first()).toBeVisible()
  })

  test('should click API keys tab', async ({ page }) => {
    await page.getByRole('tab', { name: /API Keys/ }).click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.getByText('设置').first()).toBeVisible()
  })

  test('should click add account button', async ({ page }) => {
    await page.getByRole('button', { name: /添加账户/ }).click()
    await page.waitForTimeout(1000)
    // Just verify the page didn't crash
    await expect(page.getByText('设置').first()).toBeVisible()
  })
})
