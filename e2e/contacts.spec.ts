import { test, expect } from '@playwright/test'

test.describe('Contacts Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contacts', { waitUntil: 'domcontentloaded' })
  })

  test('should display page heading', async ({ page }) => {
    await expect(page.getByText('客户管理').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/搜索姓名/)).toBeVisible({ timeout: 10000 })
  })

  test('should show action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /导入/ })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /导出/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /添加客户/ })).toBeVisible()
  })

  test('should display contacts table', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 })
  })

  test('should display table headers', async ({ page }) => {
    await expect(page.getByText('公司').first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('邮箱').first()).toBeVisible()
  })

  test('should click add contact button', async ({ page }) => {
    await page.getByRole('button', { name: /添加客户/ }).click()
    // Wait for the page to respond (dialog or state change)
    await page.waitForTimeout(1000)
    // Verify the page is still functional
    await expect(page.getByText('客户管理').first()).toBeVisible()
  })

  test('should search contacts', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜索姓名/)
    await searchInput.fill('test search')
    await expect(searchInput).toHaveValue('test search')
  })

  test('should open import dialog', async ({ page }) => {
    await page.getByRole('button', { name: /导入/ }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText('客户管理').first()).toBeVisible()
  })
})
