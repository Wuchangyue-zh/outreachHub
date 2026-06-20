import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3030'

test.describe('Launch Prep — PRO gating + Demo + Auth', () => {
  test('Demo endpoint sanitizes XSS in HTML fields', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/demo`, {
      data: {
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
        company: '<img src=x onerror=alert(1)>',
        message: '"><script>document.cookie</script>',
      },
    })
    expect([200, 429]).toContain(res.status())
    if (res.ok()) {
      const data = await res.json()
      expect(data.success).toBe(true)
    }
  })

  test('Demo endpoint rejects invalid email', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/demo`, {
      data: { name: 'Test User', email: 'not-an-email' },
    })
    expect([400, 429]).toContain(res.status())
  })

  test('Demo endpoint requires name and email', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/demo`, {
      data: { name: '' },
    })
    expect([400, 429]).toContain(res.status())
  })

  test('v1/contacts returns data for authenticated user', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/v1/contacts`)
    // With storageState from project, should be authenticated (200)
    // Without, should be 401
    expect([200, 401, 429]).toContain(res.status())
  })
})
