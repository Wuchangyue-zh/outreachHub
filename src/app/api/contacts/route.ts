import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 100 })

export async function GET(req: NextRequest) {
  const rateLimitResult = limiter.check(req, 30)
  if (rateLimitResult) return rateLimitResult

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const country = searchParams.get('country') || ''
    const tags = searchParams.get('tags')?.split(',') || []

    const skip = (page - 1) * limit

    const where: any = {}
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { emails: { some: { address: { contains: search, mode: 'insensitive' } } } },
      ]
    }
    if (status) where.status = status
    if (country) where.countryCode = country
    if (tags.length > 0 && tags[0] !== '') {
      where.tags = { hasSome: tags }
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          emails: true,
          company: { select: { id: true, name: true, domain: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contact.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: contacts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Get contacts error:', error)
    return NextResponse.json({ error: '获取客户列表失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const rateLimitResult = limiter.check(req, 10)
  if (rateLimitResult) return rateLimitResult

  try {
    const body = await req.json()
    const { firstName, lastName, title, department, company, emails, phones, tags, notes, country, city } = body

    if (!firstName || !emails || emails.length === 0) {
      return NextResponse.json({ error: '姓名和邮箱为必填项' }, { status: 400 })
    }

    // Check if email already exists
    const existingEmail = await prisma.contactEmail.findFirst({
      where: { address: emails[0] },
    })
    if (existingEmail) {
      return NextResponse.json({ error: '该邮箱已被其他客户使用' }, { status: 409 })
    }

    // Create or find company
    let companyId = null
    if (company) {
      const existingCompany = await prisma.company.findFirst({
        where: { name: { equals: company, mode: 'insensitive' } },
      })
      if (existingCompany) {
        companyId = existingCompany.id
      } else {
        const newCompany = await prisma.company.create({
          data: {
            name: company,
            country,
            city,
          },
        })
        companyId = newCompany.id
      }
    }

    const contact = await prisma.contact.create({
      data: {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName || ''}`.trim(),
        title,
        department,
        companyId,
        emails: {
          create: emails.map((email: string, i: number) => ({
            address: email,
            isPrimary: i === 0,
          })),
        },
        phones: phones || [],
        country,
        city,
        tags: tags || [],
        notes,
      },
      include: { emails: true, company: true },
    })

    return NextResponse.json({ success: true, data: contact })
  } catch (error) {
    console.error('Create contact error:', error)
    return NextResponse.json({ error: '创建客户失败' }, { status: 500 })
  }
}
