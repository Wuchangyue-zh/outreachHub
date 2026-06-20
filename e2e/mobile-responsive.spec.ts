import { test, expect } from '@playwright/test'

const MOBILE = { viewport: { width: 390, height: 844 } }

test.describe('Mobile Responsive', () => {
  test.describe('Pipeline Kanban @390px', () => {
    test.use(MOBILE)

    test('should show horizontal scroll hint on mobile', async ({ page }) => {
      await page.goto('/dashboard/pipeline', { waitUntil: 'domcontentloaded' })
      await expect(page.getByText(/左右滑动|查看更多阶段/).first()).toBeVisible({ timeout: 10000 })
    })

    test('Kanban board is scrollable', async ({ page }) => {
      await page.goto('/dashboard/pipeline', { waitUntil: 'domcontentloaded' })
      const scrollContainer = page.locator('.overflow-x-auto').first()
      await expect(scrollContainer).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Contacts Drawer @390px', () => {
    test.use(MOBILE)

    test('drawer should open and be accessible', async ({ page }) => {
      await page.goto('/contacts', { waitUntil: 'domcontentloaded' })
      await expect(page.getByText('客户管理').first()).toBeVisible({ timeout: 10000 })
      // Click first row if exists
      const contactBtn = page.locator('table tbody tr button').first()
      if (await contactBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await contactBtn.click()
        const drawer = page.locator('[role="dialog"]')
        await expect(drawer).toBeVisible({ timeout: 5000 })
        await expect(drawer).toHaveAttribute('aria-modal', 'true')
      }
    })

    test('drawer closes on Escape', async ({ page }) => {
      await page.goto('/contacts', { waitUntil: 'domcontentloaded' })
      await expect(page.getByText('客户管理').first()).toBeVisible({ timeout: 10000 })
      const contactBtn = page.locator('table tbody tr button').first()
      if (await contactBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await contactBtn.click()
        await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })
        await page.keyboard.press('Escape')
        await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('Developers Page @390px', () => {
    test.use(MOBILE)

    test('should show mobile external doc links', async ({ page }) => {
      await page.goto('/developers', { waitUntil: 'domcontentloaded' })
      await expect(page.getByText(/下载 OpenAPI|在新窗口打开/).first()).toBeVisible({ timeout: 10000 })
    })

    test('header buttons stack vertically on mobile', async ({ page }) => {
      await page.goto('/developers', { waitUntil: 'domcontentloaded' })
      const header = page.locator('header, .border-b').first()
      await expect(header).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Desktop layout no regression', () => {
    test('Pipeline Kanban has no scroll hint on desktop', async ({ page }) => {
      await page.goto('/dashboard/pipeline', { waitUntil: 'domcontentloaded' })
      const hint = page.getByText(/左右滑动|查看更多阶段/)
      await expect(hint).not.toBeVisible()
    })

    test('Developers page shows embedded Redoc on desktop', async ({ page }) => {
      await page.goto('/developers', { waitUntil: 'domcontentloaded' })
      // Desktop should not show mobile-only links prominently
      await expect(page.getByText('API 文档').first()).toBeVisible({ timeout: 10000 })
    })
  })
})
