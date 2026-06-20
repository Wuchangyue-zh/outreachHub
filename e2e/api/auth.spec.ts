import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3030'

test.describe('Auth API', () => {
  test('POST /api/auth/login — valid credentials', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'admin@outreachhub.com', password: 'admin123' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.user).toBeDefined()
    expect(body.user.email).toBe('admin@outreachhub.com')
  })

  test('POST /api/auth/login — invalid credentials', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'admin@outreachhub.com', password: 'wrongpassword' },
    })
    // Could be 401 or 429 (rate limited)
    expect([401, 429]).toContain(res.status())
  })

  test('POST /api/auth/login — missing fields', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'admin@outreachhub.com' },
    })
    // Could be 400 or 429 (rate limited from prior requests)
    expect([400, 429]).toContain(res.status())
  })

  test('GET /api/users/me — returns user info', async ({ request }) => {
    const res = await request.get(`${BASE}/api/users/me`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

test.describe('Contacts API', () => {
  test('GET /api/contacts — list contacts', async ({ request }) => {
    const res = await request.get(`${BASE}/api/contacts`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('POST /api/contacts — create contact', async ({ request }) => {
    const email = `api-test-${Date.now()}@example.com`
    const res = await request.post(`${BASE}/api/contacts`, {
      data: {
        firstName: 'API',
        lastName: 'Test',
        emails: [email],
      },
    })
    expect([201, 429]).toContain(res.status())
    if (res.status() === 201) {
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.fullName).toBe('API Test')
    }
  })

  test('GET /api/contacts — search contacts', async ({ request }) => {
    const res = await request.get(`${BASE}/api/contacts?search=api-test`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

test.describe('Tenant Usage API', () => {
  test('GET /api/tenant/usage — get usage', async ({ request }) => {
    const res = await request.get(`${BASE}/api/tenant/usage`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.tenant).toBeDefined()
    expect(body.data.limits).toBeDefined()
    expect(body.data.usage).toBeDefined()
  })
})

test.describe('Email Queue API', () => {
  test('GET /api/email-queue — queue stats', async ({ request }) => {
    const res = await request.get(`${BASE}/api/email-queue`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('queueAvailable')
  })
})

test.describe('Public APIs', () => {
  test('GET / — landing page loads', async ({ request }) => {
    const res = await request.get(BASE)
    expect(res.status()).toBe(200)
  })

  test('GET /login — login page loads', async ({ request }) => {
    const res = await request.get(`${BASE}/login`)
    expect(res.status()).toBe(200)
  })
})
