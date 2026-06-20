import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3030'

test.describe('Campaign Stats API', () => {
  test('GET /api/campaigns/stats — returns geo data', async ({ request }) => {
    const res = await request.get(`${BASE}/api/campaigns/stats`)
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
  let accountId = ''

  test.beforeAll(async ({ request }) => {
    const accountsRes = await request.get(`${BASE}/api/email-accounts`)
    const accountsBody = await accountsRes.json()
    if (accountsBody.data?.length > 0) {
      accountId = accountsBody.data[0].id
    }
  })

  test('GET /api/email-accounts/[id]/dns-records — returns records + verification', async ({ request }) => {
    test.skip(!accountId, 'No email account found')

    const res = await request.get(`${BASE}/api/email-accounts/${accountId}/dns-records`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.domain).toBeDefined()
    expect(Array.isArray(body.data.records)).toBe(true)
    expect(Array.isArray(body.data.verification)).toBe(true)
    expect(Array.isArray(body.data.tips)).toBe(true)

    for (const rec of body.data.records) {
      expect(rec).toHaveProperty('type')
      expect(rec).toHaveProperty('host')
      expect(rec).toHaveProperty('value')
      expect(rec).toHaveProperty('status')
    }
  })
})

test.describe('GDPR Export API', () => {
  let contactId = ''

  test.beforeAll(async ({ request }) => {
    const contactsRes = await request.get(`${BASE}/api/contacts`)
    const contactsBody = await contactsRes.json()
    if (contactsBody.data?.length > 0) {
      contactId = contactsBody.data[0].id
    }
  })

  test('GET /api/contacts/[id]/export — returns JSON download', async ({ request }) => {
    test.skip(!contactId, 'No contact found')

    const res = await request.get(`${BASE}/api/contacts/${contactId}/export`)
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
