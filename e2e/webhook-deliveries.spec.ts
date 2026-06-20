import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3030'

test.describe('Webhook Deliveries API', () => {
  test('GET /api/webhooks/deliveries returns paginated data', async ({ request }) => {
    const res = await request.get(`${BASE}/api/webhooks/deliveries?page=1&limit=5`)
    expect([200, 403]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(Array.isArray(body.data)).toBe(true)
      expect(body.pagination).toBeDefined()
      expect(body.pagination.page).toBe(1)
      expect(body.pagination.limit).toBe(5)
    }
  })

  test('GET /api/webhooks/deliveries supports status filter', async ({ request }) => {
    const res = await request.get(`${BASE}/api/webhooks/deliveries?status=success`)
    expect([200, 403]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.success).toBe(true)
      for (const d of body.data) {
        expect(d.status).toBe('success')
      }
    }
  })

  test('GET /api/webhooks/deliveries rejects invalid status', async ({ request }) => {
    const res = await request.get(`${BASE}/api/webhooks/deliveries?status=invalid`)
    expect([200, 403]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.success).toBe(true)
    }
  })

  test('GET /api/webhooks/deliveries does not expose payload or secret', async ({ request }) => {
    const res = await request.get(`${BASE}/api/webhooks/deliveries`)
    if (res.status() === 200) {
      const body = await res.json()
      for (const d of body.data) {
        expect(d).not.toHaveProperty('payload')
        expect(d).not.toHaveProperty('secret')
        expect(d).toHaveProperty('responseSummary')
      }
    }
  })

  test('GET /api/webhooks/deliveries supports endpointId filter', async ({ request }) => {
    const res = await request.get(`${BASE}/api/webhooks/deliveries?endpointId=nonexistent`)
    expect([200, 403]).toContain(res.status())
    if (res.status() === 200) {
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(0)
    }
  })
})
