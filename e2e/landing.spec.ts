import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should load landing page successfully', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/OutreachHub/)
  })

  test('should display hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('智能海外拓客')).toBeVisible()
  })

  test('should have login and register links', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /登录/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /注册/ })).toBeVisible()
  })

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /登录/ }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /注册/ }).click()
    await expect(page).toHaveURL(/\/register/)
  })

  test('should display feature cards', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('AI 智能拓客')).toBeVisible()
    await expect(page.getByText('邮件自动化')).toBeVisible()
    await expect(page.getByText('数据分析')).toBeVisible()
  })

  test('should have working CTA buttons', async ({ page }) => {
    await page.goto('/')
    const ctaButton = page.getByRole('link', { name: /开始使用|免费试用/ }).first()
    await expect(ctaButton).toBeVisible()
    await ctaButton.click()
    await expect(page).toHaveURL(/\/register|\/login/)
  })
})
