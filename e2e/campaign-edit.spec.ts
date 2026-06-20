import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3030'

test.describe('Campaign Edit Mode', () => {
  test('should load DRAFT campaign data in edit wizard', async ({ page }) => {
    // First create a campaign via API
    const res = await page.request.post(`${BASE}/api/campaigns`, {
      data: {
        name: `E2E Edit Test ${Date.now()}`,
        subject: 'Edit Test Subject',
        content: 'Edit test content body',
        htmlContent: '<p>Edit test content</p>',
        type: 'SINGLE',
        status: 'DRAFT',
        contactIds: [],
        scheduleType: 'IMMEDIATE',
        timezone: 'Asia/Shanghai',
      },
    })
    expect(res.ok()).toBeTruthy()
    const { data: campaign } = await res.json()

    // Navigate to edit page
    await page.goto(`/campaigns/new?edit=${campaign.id}`, { waitUntil: 'domcontentloaded' })

    // Should show loading then the wizard
    await expect(page.getByText('基础信息').first()).toBeVisible({ timeout: 15000 })

    // Wait for hydration to complete
    const nameInput = page.getByPlaceholder(/例：2024 Q4/)
    await expect(nameInput).not.toHaveValue('', { timeout: 10000 })
    await expect(nameInput).toHaveValue(campaign.name)

    try {
      // verified above
    } finally {
      await page.request.delete(`${BASE}/api/campaigns/${campaign.id}`).catch(()=>{})
    }
  })

  test('should show error for RUNNING campaign', async ({ page }) => {
    // Create a campaign and set it to RUNNING via API
    const res = await page.request.post(`${BASE}/api/campaigns`, {
      data: {
        name: `E2E Running ${Date.now()}`,
        subject: 'Test',
        content: 'Test',
        type: 'SINGLE',
        status: 'DRAFT',
        contactIds: [],
        scheduleType: 'IMMEDIATE',
      },
    })
    const { data: campaign } = await res.json()

    // Set status to RUNNING
    await page.request.patch(`${BASE}/api/campaigns/${campaign.id}`, {
      data: { status: 'RUNNING' },
    })

    // Try to edit
    await page.goto(`/campaigns/new?edit=${campaign.id}`, { waitUntil: 'domcontentloaded' })

    // Should show error
    await expect(page.getByText(/仅支持编辑|DRAFT.*PAUSED/)).toBeVisible({ timeout: 10000 })

    // Cleanup
    await page.request.patch(`${BASE}/api/campaigns/${campaign.id}`, { data: { status: 'DRAFT' } })
    await page.request.delete(`${BASE}/api/campaigns/${campaign.id}`)
  })

  test('should save edited campaign via PATCH', async ({ page }) => {
    // Create a campaign
    const res = await page.request.post(`${BASE}/api/campaigns`, {
      data: {
        name: `E2E Save Test ${Date.now()}`,
        subject: 'Original Subject',
        content: 'Original content',
        type: 'SINGLE',
        status: 'DRAFT',
        contactIds: [],
        scheduleType: 'IMMEDIATE',
      },
    })
    const { data: campaign } = await res.json()

    // PATCH the campaign
    const patchRes = await page.request.patch(`${BASE}/api/campaigns/${campaign.id}`, {
      data: {
        name: 'Updated Name',
        subject: 'Updated Subject',
        content: 'Updated content',
      },
    })
    expect(patchRes.ok()).toBeTruthy()
    const { data: updated } = await patchRes.json()
    expect(updated.name).toBe('Updated Name')

    // Verify via GET
    const getRes = await page.request.get(`${BASE}/api/campaigns/${campaign.id}`)
    const { data: fetched } = await getRes.json()
    expect(fetched.name).toBe('Updated Name')
    expect(fetched.content).toBe('Updated content')

    // Cleanup
    await page.request.delete(`${BASE}/api/campaigns/${campaign.id}`)
  })

  test('should sync contacts via PATCH', async ({ page }) => {
    // Create a campaign
    const campRes = await page.request.post(`${BASE}/api/campaigns`, {
      data: {
        name: `E2E Contact Sync ${Date.now()}`,
        subject: 'Test',
        content: 'Test',
        type: 'SINGLE',
        status: 'DRAFT',
        contactIds: [],
        scheduleType: 'IMMEDIATE',
      },
    })
    const { data: campaign } = await campRes.json()

    // Create a contact
    const contactRes = await page.request.post(`${BASE}/api/contacts`, {
      data: {
        firstName: 'EditTest',
        lastName: 'Contact',
        emails: [`edit-test-${Date.now()}@example.com`],
      },
    })
    const { data: contact } = await contactRes.json()

    // Update campaign with contact
    const patchRes = await page.request.patch(`${BASE}/api/campaigns/${campaign.id}`, {
      data: { contactIds: [contact.id] },
    })
    expect(patchRes.ok()).toBeTruthy()

    // Verify contacts are synced
    const getRes = await page.request.get(`${BASE}/api/campaigns/${campaign.id}`)
    const { data: fetched } = await getRes.json()
    expect(fetched.campaignContacts).toHaveLength(1)
    expect(fetched.campaignContacts[0].contactId).toBe(contact.id)

    // Cleanup
    await page.request.delete(`${BASE}/api/campaigns/${campaign.id}`)
    await page.request.delete(`${BASE}/api/contacts/${contact.id}`)
  })

  test('should reject PATCH on RUNNING campaign content fields', async ({ request }) => {
    // Create and set to RUNNING
    const res = await request.post(`${BASE}/api/campaigns`, {
      data: {
        name: `E2E Guard ${Date.now()}`,
        subject: 'Test',
        content: 'Test',
        type: 'SINGLE',
        status: 'DRAFT',
        contactIds: [],
        scheduleType: 'IMMEDIATE',
      },
    })
    const { data: campaign } = await res.json()

    await request.patch(`${BASE}/api/campaigns/${campaign.id}`, {
      data: { status: 'RUNNING' },
    })

    // Try to edit content
    const patchRes = await request.patch(`${BASE}/api/campaigns/${campaign.id}`, {
      data: { name: 'Should Fail' },
    })
    expect(patchRes.status()).toBe(403)
    const body = await patchRes.json()
    expect(body.error?.message || body.message).toMatch(/仅.*编辑|DRAFT.*PAUSED/)

    // Cleanup: reset to DRAFT then delete
    await request.patch(`${BASE}/api/campaigns/${campaign.id}`, { data: { status: 'DRAFT' } })
    await request.delete(`${BASE}/api/campaigns/${campaign.id}`)
  })

  test('should have edit button on campaigns list for DRAFT', async ({ page }) => {
    // Create a DRAFT campaign
    const res = await page.request.post(`${BASE}/api/campaigns`, {
      data: {
        name: `E2E Edit Btn ${Date.now()}`,
        subject: 'Test',
        content: 'Test',
        type: 'SINGLE',
        status: 'DRAFT',
        contactIds: [],
        scheduleType: 'IMMEDIATE',
      },
    })
    const { data: campaign } = await res.json()

    await page.goto('/campaigns', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(campaign.name)).toBeVisible({ timeout: 10000 })

    // Should have an edit button (Pencil icon with title="编辑")
    const editBtn = page.getByTitle('编辑')
    await expect(editBtn.first()).toBeVisible({ timeout: 5000 })

    // Cleanup
    await page.request.delete(`${BASE}/api/campaigns/${campaign.id}`)
  })
})
