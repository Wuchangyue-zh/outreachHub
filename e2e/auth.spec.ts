import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3030'

// Login via API and set cookies
async function loginViaApi(request: any, context: any) {
  const res = await request.post(`${BASE}/api/auth/login`, {
    data: { email: 'admin@outreachhub.com', password: 'admin123' },
  })
  const setCookie = res.headers()['set-cookie']
  if (setCookie) {
    const match = setCookie.match(/auth-token=([^;]+)/)
    if (match) {
      await context.addCookies([{
        name: 'auth-token',
        value: match[1],
        domain: 'localhost',
        path: '/',
      }])
    }
  }
}

test.describe('Authentication', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /登录/ })).toBeVisible()
  })

  test('should display register form', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('#name')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /注册/ })).toBeVisible()
  })

  test('should navigate between login and register', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /免费注册/ }).click()
    await expect(page).toHaveURL(/\/register/)
    await page.getByRole('link', { name: /登录/ }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('should login with demo credentials', async ({ page, request, context }) => {
    await loginViaApi(request, context)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText('仪表盘').first()).toBeVisible({ timeout: 10000 })
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    const emailInput = page.locator('#email')
    await emailInput.click()
    await emailInput.pressSequentially('invalid@example.com', { delay: 10 })
    const passwordInput = page.locator('#password')
    await passwordInput.click()
    await passwordInput.pressSequentially('wrongpassword', { delay: 10 })
    await page.getByRole('button', { name: /登录/ }).click()
    await expect(page.getByText(/错误|失败|invalid/i)).toBeVisible({ timeout: 10000 })
  })

  test('should logout via API', async ({ page, request, context }) => {
    await loginViaApi(request, context)
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('仪表盘').first()).toBeVisible({ timeout: 10000 })
    
    // Logout via API
    await page.evaluate(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
    })
    
    // Navigate to a protected route to verify logout
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('should protect dashboard route', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('should protect contacts route', async ({ page }) => {
    await page.goto('/contacts')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('should protect campaigns route', async ({ page }) => {
    await page.goto('/campaigns')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
