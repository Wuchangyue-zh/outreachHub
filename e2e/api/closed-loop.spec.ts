import { test, expect } from '@playwright/test'

/**
 * Closed-loop smoke: contact → campaign (CampaignContact) → launch gate.
 * Full SMTP send requires a real EmailAccount; this suite verifies association table write
 * and that launch rejects when no sender account is configured.
 */
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3030'

async function registerAndGetCookie(request: import('@playwright/test').APIRequestContext) {
  const email = `loop-${Date.now()}@example.com`
  const password = 'TestPass123!'
  const res = await request.post(`${BASE}/api/auth/register`, {
    data: {
      name: 'Loop Tester',
      email,
      password,
      company: 'Loop Co',
      consentAt: new Date().toISOString(),
    },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.success).toBe(true)
  return { email, password }
}

test.describe('Closed loop: contacts → campaign association', () => {
  test('POST /api/campaigns writes CampaignContact rows (not only legacy contactIds)', async ({
    request,
  }) => {
    await registerAndGetCookie(request)

    const contactRes = await request.post(`${BASE}/api/contacts`, {
      data: {
        firstName: 'Loop',
        lastName: 'Buyer',
        emails: [`buyer-${Date.now()}@example.com`],
      },
    })
    expect([200, 201]).toContain(contactRes.status())
    const contactBody = await contactRes.json()
    expect(contactBody.success).toBe(true)
    const contactId = contactBody.data.id as string

    const campRes = await request.post(`${BASE}/api/campaigns`, {
      data: {
        name: `Loop Campaign ${Date.now()}`,
        subject: 'Hello {{FirstName}}',
        content: 'Test body',
        htmlContent: '<p>Test body</p>',
        type: 'SINGLE',
        contactIds: [contactId],
      },
    })
    expect(campRes.status()).toBe(200)
    const campBody = await campRes.json()
    expect(campBody.success).toBe(true)
    const campaignId = campBody.data.id as string

    const listRes = await request.get(`${BASE}/api/campaigns?page=1&limit=20`)
    expect(listRes.status()).toBe(200)
    const listBody = await listRes.json()
    const created = (listBody.data as Array<{ id: string; _count?: { campaignContacts: number } }>).find(
      (c) => c.id === campaignId
    )
    expect(created).toBeTruthy()
    expect(created!._count?.campaignContacts ?? 0).toBeGreaterThanOrEqual(1)

    // Launch without EmailAccount must fail with a clear error (not silent)
    const launchRes = await request.post(`${BASE}/api/campaigns/${campaignId}/launch`)
    expect([400, 403]).toContain(launchRes.status())
    const launchBody = await launchRes.json()
    expect(launchBody.success).toBeFalsy()
  })

  test('GET /api/health returns readiness', async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`)
    expect([200, 503]).toContain(res.status())
    const body = await res.json()
    expect(body.checks).toBeDefined()
    expect(body.checks.app).toBe('ok')
  })
})
