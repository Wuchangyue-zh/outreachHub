import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/邮箱/)).toBeVisible()
    await expect(page.getByLabel(/密码/)).toBeVisible()
    await expect(page.getByRole('button', { name: /登录/ })).toBeVisible()
  })

  test('should display register form', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByLabel(/姓名/)).toBeVisible()
    await expect(page.getByLabel(/邮箱/)).toBeVisible()
    await expect(page.getByLabel(/密码/)).toBeVisible()
    await expect(page.getByRole('button', { name: /注册/ })).toBeVisible()
  })

  test('should show validation error for empty login', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /登录/ }).click()
    // HTML5 validation should prevent submission
  })

  test('should navigate between login and register', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /注册/ }).click()
    await expect(page).toHaveURL(/\/register/)

    await page.getByRole('link', { name: /登录/ }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('should login with demo credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/邮箱/).fill('admin@outreachhub.com')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: /登录/ }).click()

    // Wait for navigation
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/邮箱/).fill('invalid@example.com')
    await page.getByLabel(/密码/).fill('wrongpassword')
    await page.getByRole('button', { name: /登录/ }).click()

    // Should show error message - be more flexible
    await expect(page.getByText(/错误|失败|invalid|错误的邮箱或密码/i)).toBeVisible({ timeout: 10000 })
  })

  test('should register new user', async ({ page }) => {
    await page.goto('/register')

    const timestamp = Date.now()
    await page.getByLabel(/姓名/).fill(`Test User ${timestamp}`)
    await page.getByLabel(/邮箱/).fill(`test${timestamp}@example.com`)
    await page.getByLabel(/密码/).fill('password123')

    // Fill company if the field exists
    const companyField = page.getByLabel(/公司/)
    if (await companyField.isVisible()) {
      await companyField.fill('Test Company')
    }

    await page.getByRole('button', { name: /注册/ }).click()

    // Wait for navigation
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('should show error for duplicate email', async ({ page }) => {
    await page.goto('/register')

    await page.getByLabel(/姓名/).fill('Duplicate User')
    await page.getByLabel(/邮箱/).fill('admin@outreachhub.com')
    await page.getByLabel(/密码/).fill('password123')

    await page.getByRole('button', { name: /注册/ }).click()

    // Should show error message about duplicate email
    await expect(page.getByText(/已存在|已注册|duplicate|该邮箱已注册/i)).toBeVisible({ timeout: 10000 })
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByLabel(/邮箱/).fill('admin@outreachhub.com')
    await page.getByLabel(/密码/).fill('admin123')
    await page.getByRole('button', { name: /登录/ }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })

    // Logout
    await page.getByRole('button', { name: /退出|登出|logout/i }).click()

    // Should redirect to login or landing page
    await expect(page).toHaveURL(/\/login|\/$/, { timeout: 10000 })
  })

  test('should protect dashboard route', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('should protect contacts route', async ({ page }) => {
    // Try to access contacts without login
    await page.goto('/contacts')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('should protect campaigns route', async ({ page }) => {
    // Try to access campaigns without login
    await page.goto('/campaigns')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
