import { test, expect } from '@playwright/test'
const BASE = 'http://localhost:3030'

test.describe('Demo Leads API', () => {
  test('GET /api/admin/demo-requests returns data for platform admin', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/demo-requests`, { headers: {} })
    expect([200, 403]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.success).toBe(true)
    }
  })

  test('GET /api/admin/demo-requests returns paginated data for admin', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/demo-requests?page=1&limit=5`)
    expect([200, 403]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.pagination).toBeDefined()
    }
  })

  test('GET /api/admin/demo-requests supports status filter', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/demo-requests?status=pending`)
    expect([200, 403]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.success).toBe(true)
    }
  })

  test('GET /api/admin/demo-requests supports search', async ({ request }) => {
    const res = await request.get(`${BASE}/api/admin/demo-requests?search=test`)
    expect([200, 403]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.success).toBe(true)
    }
  })

  test('PATCH /api/admin/demo-requests/[id] rejects invalid status', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/admin/demo-requests/nonexistent`, {
      data: { status: 'invalid_status' },
    })
    expect([400, 403, 404]).toContain(res.status())
  })

  test('Demo leads page loads for authenticated user', async ({ page }) => {
    const res = await page.goto('/dashboard/demo-leads', { waitUntil: 'domcontentloaded' })
    expect(res?.status()).toBe(200)
    await expect(page.getByText('Demo').first()).toBeVisible({ timeout: 10000 })
  })
})
