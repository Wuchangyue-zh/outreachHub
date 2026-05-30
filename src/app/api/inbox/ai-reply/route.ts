import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthToken } from '@/lib/auth-middleware'
import { errorResponse, ErrorCodes, handleApiError } from '@/lib/api-errors'
import { generateInboxReply } from '@/lib/openai'

async function resolveSender(userId: string, emailAccountId?: string) {
  if (emailAccountId) {
    const account = await prisma.emailAccount.findFirst({
      where: { id: emailAccountId, userId, isActive: true },
      select: {
        email: true,
        displayName: true,
        user: {
          select: {
            name: true,
            tenant: { select: { name: true } },
          },
        },
      },
    })
    if (account) {
      return {
        name: account.displayName || account.user.name || account.email.split('@')[0],
        email: account.email,
        company: account.user.tenant?.name,
      }
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      emailAccounts: {
        where: { isActive: true },
        take: 1,
        select: { email: true, displayName: true },
      },
      tenant: { select: { name: true } },
    },
  })

  if (!user) {
    return { name: 'Sales Team', email: '', company: undefined as string | undefined }
  }

  const fallbackAccount = user.emailAccounts[0]
  return {
    name:
      fallbackAccount?.displayName ||
      user.name ||
      fallbackAccount?.email.split('@')[0] ||
      user.email.split('@')[0],
    email: fallbackAccount?.email || user.email,
    company: user.tenant?.name,
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuthToken(req)
    if (!auth.success) return errorResponse(ErrorCodes.UNAUTHORIZED, auth.error || 'Unauthorized', 401)
    if (!auth.userId) return errorResponse(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)

    const body = await req.json()
    const {
      contactName,
      contactEmail,
      company,
      country,
      intent,
      messages,
      existingDraft,
      mode,
      emailAccountId,
    } = body

    if (!contactName || !contactEmail) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '缺少联系人信息', 400)
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '缺少对话历史', 400)
    }

    const replyMode = mode === 'expand' ? 'expand' : 'draft'

    if (replyMode === 'expand' && !existingDraft?.trim()) {
      return errorResponse(ErrorCodes.VALIDATION_ERROR, '请先输入草稿内容再进行 AI 扩写', 400)
    }

    const sender = await resolveSender(auth.userId, emailAccountId)

    const draft = await generateInboxReply({
      contactName,
      contactEmail,
      company: company || '',
      country,
      intent,
      messages,
      existingDraft,
      mode: replyMode,
      sender,
    })

    return NextResponse.json({ success: true, data: { draft, sender } })
  } catch (error) {
    return handleApiError(error)
  }
}
