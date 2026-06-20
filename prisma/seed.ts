import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('开始初始化种子数据...')

  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@outreachhub.com' },
    select: { id: true },
  })

  if (existingAdmin) {
    console.log('演示数据已初始化，跳过重复创建。')
    await prisma.user.update({ where: { email: 'admin@outreachhub.com' }, data: { isPlatformAdmin: true } }).catch(() => {})
    return
  }

  // 创建演示租户
  const tenant = await prisma.tenant.create({
    data: {
      name: 'OutreachHub演示企业',
      plan: 'PRO',
      maxUsers: 5,
      maxContacts: 10000,
      maxEmailsPerDay: 200,
    },
  })

  // 创建管理员用户
  const adminPassword = await hash('admin123', 12)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@outreachhub.com',
      name: '管理员',
      passwordHash: adminPassword,
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  })

  // 创建示例公司
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        tenantId: tenant.id,
        name: 'TechCorp Inc',
        domain: 'techcorp.com',
        website: 'https://techcorp.com',
        industry: 'Technology',
        size: '201-500',
        country: 'United States',
        countryCode: 'US',
        city: 'San Francisco',
        region: 'California',
        linkedinUrl: 'https://linkedin.com/company/techcorp',
        tags: ['B2B', 'SaaS', 'Enterprise'],
      },
    }),
    prisma.company.create({
      data: {
        tenantId: tenant.id,
        name: 'Global Manufacturing GmbH',
        domain: 'globalmfg.de',
        website: 'https://globalmfg.de',
        industry: 'Manufacturing',
        size: '501-1000',
        country: 'Germany',
        countryCode: 'DE',
        city: 'Munich',
        region: 'Bavaria',
        tags: ['Manufacturing', 'Automotive'],
      },
    }),
    prisma.company.create({
      data: {
        tenantId: tenant.id,
        name: 'Digital Solutions Ltd',
        domain: 'digitalsolutions.co.uk',
        website: 'https://digitalsolutions.co.uk',
        industry: 'Software',
        size: '51-200',
        country: 'United Kingdom',
        countryCode: 'GB',
        city: 'London',
        region: 'England',
        tags: ['Digital', 'Consulting'],
      },
    }),
  ])

  // 创建示例联系人
  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        tenantId: tenant.id,
        companyId: companies[0].id,
        firstName: 'John',
        lastName: 'Smith',
        fullName: 'John Smith',
        title: 'Chief Technology Officer',
        department: 'Engineering',
        seniority: 'c-level',
        emails: {
          create: [
            { address: 'john.smith@techcorp.com', type: 'PROFESSIONAL', isPrimary: true, isVerified: true },
          ],
        },
        phones: ['+1-415-555-0123'],
        linkedinUrl: 'https://linkedin.com/in/johnsmith',
        country: 'United States',
        countryCode: 'US',
        city: 'San Francisco',
        tags: ['Decision Maker', 'CTO', 'Tech'],
        status: 'NEW',
      },
    }),
    prisma.contact.create({
      data: {
        tenantId: tenant.id,
        companyId: companies[1].id,
        firstName: 'Hans',
        lastName: 'Mueller',
        fullName: 'Hans Mueller',
        title: 'Procurement Director',
        department: 'Purchasing',
        seniority: 'director',
        emails: {
          create: [
            { address: 'h.mueller@globalmfg.de', type: 'PROFESSIONAL', isPrimary: true, isVerified: true },
          ],
        },
        country: 'Germany',
        countryCode: 'DE',
        city: 'Munich',
        tags: ['Procurement', 'Manufacturing'],
        status: 'CONTACTED',
      },
    }),
    prisma.contact.create({
      data: {
        tenantId: tenant.id,
        companyId: companies[2].id,
        firstName: 'Sarah',
        lastName: 'Johnson',
        fullName: 'Sarah Johnson',
        title: 'VP of Sales',
        department: 'Sales',
        seniority: 'vp',
        emails: {
          create: [
            { address: 'sarah.j@digitalsolutions.co.uk', type: 'PROFESSIONAL', isPrimary: true, isVerified: true },
          ],
        },
        country: 'United Kingdom',
        countryCode: 'GB',
        city: 'London',
        tags: ['Sales', 'B2B'],
        status: 'INTERESTED',
      },
    }),
  ])

  // 创建示例产品
  const products = await Promise.all([
    prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: '智能客服机器人',
        description: '基于AI的智能客服解决方案，支持多语言，24/7自动回复客户咨询',
        category: 'Software',
        price: 299,
        currency: 'USD',
        features: ['多语言支持', 'AI自动回复', '24/7在线', '数据分析'],
        tags: ['AI', 'Customer Service', 'SaaS'],
      },
    }),
    prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: '跨境电商ERP系统',
        description: '一站式跨境电商管理系统，支持Amazon、Shopify等多平台',
        category: 'Software',
        price: 499,
        currency: 'USD',
        features: ['多平台对接', '库存管理', '订单处理', '财务报表'],
        tags: ['E-commerce', 'ERP', 'Cross-border'],
      },
    }),
  ])

  // 创建示例邮件模板
  const templates = await Promise.all([
    prisma.emailTemplate.create({
      data: {
        tenantId: tenant.id,
        name: '冷邮件 - 产品介绍',
        subject: 'Quick question about {{companyName}}\'s {{industry}} operations',
        content: `Hi {{firstName}},

I noticed that {{companyName}} has been expanding its {{industry}} operations.

We help companies like yours streamline their processes with our AI-powered solutions. Our clients typically see a 40% reduction in operational costs within the first 3 months.

Would you be open to a quick 15-minute call this week to discuss how we could help {{companyName}}?

Best regards,
{{senderName}}`,
        category: 'cold-outreach',
        language: 'en',
        variables: ['firstName', 'companyName', 'industry', 'senderName'],
      },
    }),
    prisma.emailTemplate.create({
      data: {
        tenantId: tenant.id,
        name: '跟进邮件 - 价值提供',
        subject: 'Following up - Resource for {{companyName}}',
        content: `Hi {{firstName}},

I wanted to follow up on my previous email and share a case study that might be relevant to {{companyName}}.

We recently helped a similar {{industry}} company achieve:
- 50% faster order processing
- 30% cost reduction
- 99.9% uptime

I'd love to discuss how we could achieve similar results for {{companyName}}.

Would you have 15 minutes this week?

Best,
{{senderName}}`,
        category: 'follow-up',
        language: 'en',
        variables: ['firstName', 'companyName', 'industry', 'senderName'],
      },
    }),
    prisma.emailTemplate.create({
      data: {
        tenantId: tenant.id,
        name: '冷邮件 - 中文版',
        subject: '关于{{companyName}}的{{industry}}业务合作机会',
        content: '{{firstName}}您好，\n\n我注意到{{companyName}}在{{industry}}领域的业务发展。\n\n我们是一家专注于帮助海外企业提升运营效率的科技公司，我们的AI解决方案已帮助多家企业降低40%的运营成本。\n\n不知您是否有时间进行一次简短的电话会议，探讨我们如何为{{companyName}}提供帮助？\n\n期待您的回复。\n\n此致\n{{senderName}}',
        category: 'cold-outreach',
        language: 'zh',
        variables: ['firstName', 'companyName', 'industry', 'senderName'],
      },
    }),
  ])

  // 创建示例邮件活动
  const campaign = await prisma.campaign.create({
    data: {
      tenantId: tenant.id,
      name: '北美科技公司拓客活动',
      type: 'SEQUENCE',
      status: 'RUNNING',
      subject: 'Partnership Opportunity with {{companyName}}',
      content: 'See sequence configuration',
      contactIds: contacts.map((c) => c.id),
      scheduleType: 'SCHEDULED',
      timezone: 'America/New_York',
      totalSent: 150,
      totalOpened: 68,
      totalClicked: 24,
      totalReplied: 12,
      sentAt: new Date(),
    },
  })

  // 创建示例拓客任务
  const prospectingTask = await prisma.prospectingTask.create({
    data: {
      tenantId: tenant.id,
      name: '北美科技公司CTO拓客',
      description: '搜索北美地区科技公司的CTO和技术总监',
      keywords: ['Software', 'SaaS', 'Technology'],
      positions: ['CTO', 'VP Engineering', 'Technical Director'],
      locations: ['United States', 'Canada'],
      industries: ['Technology', 'Software'],
      companySizes: ['51-200', '201-500', '501-1000'],
      status: 'COMPLETED',
      progress: 100,
      crawlerStatus: 2,
      crawlerProgress: 100,
      totalCompaniesFound: 247,
      totalCompaniesSaved: 189,
      totalContactsFound: 456,
      totalContactsSaved: 342,
    },
  })

  console.log('种子数据初始化完成！')
  console.log('==========================================')
  console.log('演示账户信息：')
  console.log('邮箱: admin@outreachhub.com')
  console.log('密码: admin123')
  console.log('==========================================')
  console.log(`创建了 ${companies.length} 家公司`)
  console.log(`创建了 ${contacts.length} 个联系人`)
  console.log(`创建了 ${products.length} 个产品`)
  console.log(`创建了 ${templates.length} 个邮件模板`)
  console.log(`创建了 1 个邮件活动`)
  console.log(`创建了 1 个拓客任务`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('种子数据初始化失败:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
