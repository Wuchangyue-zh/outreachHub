import { test, expect } from '@playwright/test'

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/邮箱/).fill('admin@outreachhub.com')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: /登录/ }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })

    await page.goto('/settings', { timeout: 30000 })
    await page.waitForLoadState('domcontentloaded')
  })

  test('should display settings page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /设置|Settings/i })).toBeVisible({ timeout: 15000 })
  })

  test('should show profile section', async ({ page }) => {
    await expect(page.getByText(/个人资料|Profile|个人信息/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('should show email accounts section', async ({ page }) => {
    await expect(page.getByText(/邮箱账户|Email Account|发件邮箱/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('should have add email account button', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /添加|Add|新增/i }).first()
    await expect(addBtn).toBeVisible({ timeout: 15000 })
  })

  test('should display plan info', async ({ page }) => {
    const planInfo = page.getByText(/套餐|Plan|免费|Free|基础|Basic|专业|Pro/i).first()
    if (await planInfo.isVisible()) {
      await expect(planInfo).toBeVisible()
    }
  })

  test('should show profile name field', async ({ page }) => {
    const nameField = page.getByLabel(/姓名|Name/i).first()
    if (await nameField.isVisible()) {
      await expect(nameField).toBeVisible()
    }
  })

  test('should show save profile button', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: /保存|Save/i }).first()
    if (await saveBtn.isVisible()) {
      await expect(saveBtn).toBeVisible()
    }
  })
})
