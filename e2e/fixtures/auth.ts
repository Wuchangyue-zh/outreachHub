import { Page } from '@playwright/test'

const BASE_URL = 'http://localhost:3030'

export const TEST_USER = {
  email: 'admin@outreachhub.com',
  password: 'admin123',
}

/**
 * Login via API and save storageState to disk.
 * Called once by global-setup.ts before all tests.
 */
export async function setupAuth(): Promise<void> {
  const { chromium } = require('@playwright/test')
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await page.getByLabel(/邮箱/).fill(TEST_USER.email)
  await page.getByLabel(/密码/).fill(TEST_USER.password)
  await page.getByRole('button', { name: /登录/ }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })

  await context.storageState({ path: 'e2e/.auth/user.json' })
  await browser.close()
}

/**
 * Helper for tests that need to login inline (e.g. auth.spec.ts negative tests).
 */
export async function loginViaUI(page: Page): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByLabel(/邮箱/).fill(TEST_USER.email)
  await page.getByLabel(/密码/).fill(TEST_USER.password)
  await page.getByRole('button', { name: /登录/ }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
}

/**
 * Get auth cookie value via API login (for API-mode tests).
 */
export async function getAuthToken(request: any): Promise<string> {
  const res = await request.post(`${BASE_URL}/api/auth/login`, {
    data: { email: TEST_USER.email, password: TEST_USER.password },
  })
  const cookies = res.headers()['set-cookie']
  if (cookies) {
    const match = cookies.match(/auth-token=([^;]+)/)
    if (match) return match[1]
  }
  return ''
}
