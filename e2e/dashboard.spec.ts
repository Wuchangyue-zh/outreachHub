import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  })

  test('should display dashboard page title', async ({ page }) => {
    await expect(page.getByText('仪表盘').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show statistics cards', async ({ page }) => {
    await expect(page.getByText(/总客户数|公司库|已发送邮件/).first()).toBeVisible({ timeout: 10000 })
  })

  test('should show quick actions section', async ({ page }) => {
    await expect(page.getByText('快捷操作')).toBeVisible({ timeout: 10000 })
  })

  test('should have navigation sidebar links', async ({ page }) => {
    await expect(page.getByRole('link', { name: '客户管理', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: '公司库', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: '邮件营销', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: '邮件模板', exact: true })).toBeVisible()
  })

  test('should navigate to contacts page', async ({ page }) => {
    await page.getByRole('link', { name: '客户管理', exact: true }).click()
    await expect(page).toHaveURL(/\/contacts/)
    await expect(page.getByText('客户管理').first()).toBeVisible()
  })

  test('should navigate to campaigns page', async ({ page }) => {
    await page.getByRole('link', { name: '邮件营销', exact: true }).click()
    await expect(page).toHaveURL(/\/campaigns/)
  })

  test('should navigate to templates page', async ({ page }) => {
    await page.getByRole('link', { name: '邮件模板', exact: true }).click()
    await page.waitForURL(/\/templates/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/templates/)
  })

  test('should navigate to companies page', async ({ page }) => {
    await page.getByRole('link', { name: '公司库', exact: true }).click()
    await page.waitForURL(/\/companies/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/companies/)
  })

  test('should navigate to inbox page', async ({ page }) => {
    await page.getByRole('link', { name: '统一收件箱', exact: true }).click()
    await page.waitForURL(/\/dashboard\/inbox/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/dashboard\/inbox/)
  })

  test('should navigate to settings page', async ({ page }) => {
    await page.getByRole('link', { name: '邮箱设置', exact: true }).click()
    await page.waitForURL(/\/dashboard\/settings/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/dashboard\/settings/)
  })

  test('should have a logout button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /退出登录/ })).toBeVisible()
  })
})
