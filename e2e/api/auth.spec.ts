/**
 * L5: 真实 HTTP API 集成测试 — Auth + Contacts + Export
 * 使用 Playwright API 模式（无浏览器）测试实际 API 端点
 */
import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3030'

// 共享 token（通过 login 获取）
let authToken = ''

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

    // 从 cookie 提取 token
    const cookies = res.headers()['set-cookie']
    if (cookies) {
      const match = cookies.match(/auth-token=([^;]+)/)
      if (match) authToken = match[1]
    }
  })

  test('POST /api/auth/login — invalid credentials', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'admin@outreachhub.com', password: 'wrongpassword' },
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  test('POST /api/auth/login — missing fields', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'admin@outreachhub.com' },
    })
    expect(res.status()).toBe(400)
  })

  test('GET /api/auth/me — unauthenticated', async ({ request }) => {
    const res = await request.get(`${BASE}/api/users/me`)
    expect(res.status()).toBe(401)
  })
})

test.describe('Contacts API', () => {
  test.beforeAll(async ({ request }) => {
    // Login to get token
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'admin@outreachhub.com', password: 'admin123' },
    })
    const cookies = res.headers()['set-cookie']
    if (cookies) {
      const match = cookies.match(/auth-token=([^;]+)/)
      if (match) authToken = match[1]
    }
  })

  test('GET /api/contacts — list contacts', async ({ request }) => {
    const res = await request.get(`${BASE}/api/contacts`, {
      headers: { Cookie: `auth-token=${authToken}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  test('POST /api/contacts — create contact', async ({ request }) => {
    const res = await request.post(`${BASE}/api/contacts`, {
      headers: { Cookie: `auth-token=${authToken}` },
      data: {
        firstName: 'API',
        lastName: 'Test',
        emails: ['api-test@example.com'],
      },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.fullName).toBe('API Test')
  })

  test('GET /api/contacts — search contacts', async ({ request }) => {
    const res = await request.get(`${BASE}/api/contacts?search=api-test`, {
      headers: { Cookie: `auth-token=${authToken}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

test.describe('Tenant Usage API', () => {
  test('GET /api/tenant/usage — get usage', async ({ request }) => {
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'admin@outreachhub.com', password: 'admin123' },
    })
    const cookies = loginRes.headers()['set-cookie']
    let token = ''
    if (cookies) {
      const match = cookies.match(/auth-token=([^;]+)/)
      if (match) token = match[1]
    }

    const res = await request.get(`${BASE}/api/tenant/usage`, {
      headers: { Cookie: `auth-token=${token}` },
    })
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
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'admin@outreachhub.com', password: 'admin123' },
    })
    const cookies = loginRes.headers()['set-cookie']
    let token = ''
    if (cookies) {
      const match = cookies.match(/auth-token=([^;]+)/)
      if (match) token = match[1]
    }

    const res = await request.get(`${BASE}/api/email-queue`, {
      headers: { Cookie: `auth-token=${token}` },
    })
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
