import { prisma } from '@/lib/prisma'
import * as rocketreach from '@/lib/rocketreach'
import { checkContactLimit } from '@/lib/plan-limits'

export async function executeProcessProspecting() {
  await prisma.prospectingTask.updateMany({
    where: {
      status: 'RUNNING',
      startedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
    },
    data: { status: 'PENDING', crawlerStatus: 0, progress: 0 },
  })

  const task = await prisma.prospectingTask.findFirst({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  })

  if (!task) {
    return { message: '没有待处理的任务' }
  }

  if (!task.tenantId) {
    await prisma.prospectingTask.update({
      where: { id: task.id },
      data: { status: 'FAILED', crawlerStatus: 3, description: '任务缺少 tenantId' },
    })
    throw new Error('任务缺少 tenantId')
  }

  const hasCriteria =
    task.keywords.length > 0 || task.industries.length > 0 || task.positions.length > 0
  if (!hasCriteria) {
    await prisma.prospectingTask.update({
      where: { id: task.id },
      data: {
        status: 'FAILED',
        crawlerStatus: 3,
        description: '请至少填写关键词、行业或目标职位之一',
      },
    })
    return { taskId: task.id, status: 'FAILED', reason: 'empty_criteria' }
  }

  if (!process.env.ROCKETREACH_API_KEY) {
    await prisma.prospectingTask.update({
      where: { id: task.id },
      data: { status: 'FAILED', crawlerStatus: 3, description: '未配置 ROCKETREACH_API_KEY' },
    })
    throw new Error('未配置 ROCKETREACH_API_KEY')
  }

  await prisma.prospectingTask.update({
    where: { id: task.id },
    data: { status: 'RUNNING', startedAt: new Date(), crawlerStatus: 1, progress: 10 },
  })

  const results = { companiesFound: 0, companiesSaved: 0, contactsFound: 0, contactsSaved: 0 }

  try {
    if (task.keywords.length > 0 || task.industries.length > 0) {
      const searchParams: Record<string, string | number> = { limit: 25 }
      if (task.keywords.length > 0) searchParams.name = task.keywords[0]
      if (task.industries.length > 0) searchParams.industry = task.industries[0]
      if (task.locations.length > 0) searchParams.location = task.locations[0]

      const companies = await rocketreach.searchCompanies(searchParams)
      results.companiesFound = companies.length

      for (const companyData of companies) {
        try {
          const orConditions = [
            companyData.email_domain ? { domain: companyData.email_domain } : null,
            companyData.name ? { name: companyData.name } : null,
          ].filter(Boolean) as Array<{ domain?: string; name?: string }>
          if (orConditions.length === 0) continue

          const existing = await prisma.company.findFirst({
            where: { tenantId: task.tenantId, OR: orConditions },
          })
          if (existing) continue

          await prisma.company.create({
            data: {
              tenantId: task.tenantId,
              name: companyData.name,
              domain: companyData.email_domain || null,
              industry: companyData.industry_str || null,
              country: companyData.country_code || null,
              size: companyData.size || null,
              website: companyData.website || null,
              source: 'crawler',
              tags: ['prospecting'],
            },
          })
          results.companiesSaved++
        } catch { /* skip */ }
      }

      await prisma.prospectingTask.update({
        where: { id: task.id },
        data: { progress: 50, crawlerProgress: 50 },
      })
    }

    if (task.positions.length > 0 || task.keywords.length > 0) {
      const searchParams: Record<string, string | number> = { limit: 25 }
      if (task.positions.length > 0) searchParams.title = task.positions[0]
      if (task.locations.length > 0) searchParams.location = task.locations[0]
      if (task.keywords.length > 0) searchParams.company = task.keywords[0]

      const people = await rocketreach.searchPeople(searchParams)
      results.contactsFound = people.length

      for (const personData of people) {
        const contactLimit = await checkContactLimit(task.tenantId)
        if (!contactLimit.allowed) break

        try {
          const email = personData.emails?.[0]?.address || personData.teaser?.emails?.[0]
          if (!email) continue

          const existing = await prisma.contact.findFirst({
            where: {
              tenantId: task.tenantId,
              emails: { some: { address: { equals: email, mode: 'insensitive' } } },
            },
          })
          if (existing) continue

          const nameParts = (personData.name || '').trim().split(/\s+/)
          const contact = await prisma.contact.create({
            data: {
              tenantId: task.tenantId,
              fullName: personData.name || email.split('@')[0],
              firstName: nameParts[0] || null,
              lastName: nameParts.slice(1).join(' ') || null,
              title: personData.current_title || null,
              country: personData.country || null,
              countryCode: personData.country_code || null,
              source: 'crawler',
              tags: ['prospecting'],
            },
          })

          await prisma.contactEmail.create({
            data: { contactId: contact.id, address: email, isPrimary: true },
          })
          results.contactsSaved++
        } catch { /* skip */ }
      }
    }

    await prisma.prospectingTask.update({
      where: { id: task.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        crawlerStatus: 2,
        crawlerProgress: 100,
        progress: 100,
        totalCompaniesFound: results.companiesFound,
        totalCompaniesSaved: results.companiesSaved,
        totalContactsFound: results.contactsFound,
        totalContactsSaved: results.contactsSaved,
      },
    })

    return { taskId: task.id, status: 'COMPLETED', results }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await prisma.prospectingTask.update({
      where: { id: task.id },
      data: { status: 'FAILED', crawlerStatus: 3, description: `Error: ${message}` },
    })
    throw error
  }
}
