/**
 * L1: UI 组件测试 — Campaign Stats 地理分析 + DNS 对话框
 */
import { test, expect } from '@playwright/test'

test.describe('Campaign Stats API', () => {
  let token = ''

  test.beforeAll(async ({ request }) => {
    const res = await request.post('http://localhost:3030/api/auth/login', {
      data: { email: 'admin@outreachhub.com', password: 'admin123' },
    })
    const cookies = res.headers()['set-cookie']
    if (cookies) {
      const match = cookies.match(/auth-token=([^;]+)/)
      if (match) token = match[1]
    }
  })

  test('GET /api/campaigns/stats — returns geo data', async ({ request }) => {
    const res = await request.get('http://localhost:3030/api/campaigns/stats', {
      headers: { Cookie: `auth-token=${token}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('overall')
    expect(body.data).toHaveProperty('daily')
    expect(body.data).toHaveProperty('geo')
    expect(Array.isArray(body.data.geo)).toBe(true)
  })
})

test.describe('DNS Records API', () => {
  let token = ''
  let accountId = ''

  test.beforeAll(async ({ request }) => {
    const res = await request.post('http://localhost:3030/api/auth/login', {
      data: { email: 'admin@outreachhub.com', password: 'admin123' },
    })
    const cookies = res.headers()['set-cookie']
    if (cookies) {
      const match = cookies.match(/auth-token=([^;]+)/)
      if (match) token = match[1]
    }

    // 获取邮箱账户列表
    const accountsRes = await request.get('http://localhost:3030/api/email-accounts', {
      headers: { Cookie: `auth-token=${token}` },
    })
    const accountsBody = await accountsRes.json()
    if (accountsBody.data?.length > 0) {
      accountId = accountsBody.data[0].id
    }
  })

  test('GET /api/email-accounts/[id]/dns-records — returns records + verification', async ({ request }) => {
    test.skip(!accountId, 'No email account found')

    const res = await request.get(`http://localhost:3030/api/email-accounts/${accountId}/dns-records`, {
      headers: { Cookie: `auth-token=${token}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.domain).toBeDefined()
    expect(Array.isArray(body.data.records)).toBe(true)
    expect(Array.isArray(body.data.verification)).toBe(true)
    expect(Array.isArray(body.data.tips)).toBe(true)

    // 每条记录应有 type/host/value/description/status
    for (const rec of body.data.records) {
      expect(rec).toHaveProperty('type')
      expect(rec).toHaveProperty('host')
      expect(rec).toHaveProperty('value')
      expect(rec).toHaveProperty('status')
    }
  })
})

test.describe('GDPR Export API', () => {
  let token = ''
  let contactId = ''

  test.beforeAll(async ({ request }) => {
    const res = await request.post('http://localhost:3030/api/auth/login', {
      data: { email: 'admin@outreachhub.com', password: 'admin123' },
    })
    const cookies = res.headers()['set-cookie']
    if (cookies) {
      const match = cookies.match(/auth-token=([^;]+)/)
      if (match) token = match[1]
    }

    // 获取联系人列表
    const contactsRes = await request.get('http://localhost:3030/api/contacts', {
      headers: { Cookie: `auth-token=${token}` },
    })
    const contactsBody = await contactsRes.json()
    if (contactsBody.data?.length > 0) {
      contactId = contactsBody.data[0].id
    }
  })

  test('GET /api/contacts/[id]/export — returns JSON download', async ({ request }) => {
    test.skip(!contactId, 'No contact found')

    const res = await request.get(`http://localhost:3030/api/contacts/${contactId}/export`, {
      headers: { Cookie: `auth-token=${token}` },
    })
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('application/json')
    expect(res.headers()['content-disposition']).toContain('attachment')

    const body = await res.json()
    expect(body).toHaveProperty('exportDate')
    expect(body).toHaveProperty('contact')
    expect(body).toHaveProperty('emails')
    expect(body).toHaveProperty('emailLogs')
    expect(body.contact).toHaveProperty('id')
    expect(body.contact).toHaveProperty('fullName')
  })
})
