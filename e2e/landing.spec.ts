import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should load landing page successfully', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveTitle(/OutreachHub/)
  })

  test('should display hero section', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('智能海外拓客').first()).toBeVisible()
  })

  test('should have login and register links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('link', { name: /登录/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /免费试用|注册/ }).first()).toBeVisible()
  })

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: /登录/ }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: /免费试用|注册/ }).first().click()
    await expect(page).toHaveURL(/\/register/)
  })

  test('should display feature cards', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'AI 智能拓客', exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('should have working CTA buttons', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const ctaButton = page.getByRole('link', { name: /开始使用|免费试用/ }).first()
    await expect(ctaButton).toBeVisible()
    await ctaButton.click()
    await expect(page).toHaveURL(/\/register|\/login/)
  })
})
