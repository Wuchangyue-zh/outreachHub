/**
 * 千邮千面：发送前按联系人 AI 生成正文；失败则降级为变量替换母版。
 */
import { prisma } from './prisma'
import { applyEmailVariables, buildContactVariables } from './email-variables'
import { generateEmail } from './openai'

export interface PersonalizeJobFields {
  personalizePerContact?: boolean
  baseSubject?: string
  baseHtml?: string
  baseText?: string
  productDescription?: string
  tone?: string
  language?: string
}

export interface ResolvedEmailContent {
  subject: string
  html: string
  text: string
  personalized: boolean
  fallbackReason?: string
}

function mapTone(
  tone?: string
): 'professional' | 'casual' | 'friendly' | 'formal' {
  switch (tone) {
    case 'warm':
    case 'friendly':
      return 'friendly'
    case 'casual':
    case 'concise':
      return 'casual'
    case 'formal':
    case 'urgent':
      return 'formal'
    default:
      return 'professional'
  }
}

/**
 * Resolve final subject/html/text for a send job.
 * When personalizePerContact is true, calls generateEmail; on failure falls back to variable substitution.
 */
export async function resolvePersonalizedContent(input: {
  to: string
  subject: string
  html?: string
  text?: string
  contactId?: string
  personalizePerContact?: boolean
  baseSubject?: string
  baseHtml?: string
  baseText?: string
  productDescription?: string
  tone?: string
  language?: string
}): Promise<ResolvedEmailContent> {
  const baseSubject = input.baseSubject || input.subject
  const baseHtml = input.baseHtml || input.html || ''
  const baseText = input.baseText || input.text || ''

  let contact: Awaited<ReturnType<typeof loadContact>> = null
  if (input.contactId) {
    contact = await loadContact(input.contactId)
  }

  const applyVars = () => {
    if (!contact) {
      return {
        subject: baseSubject,
        html: baseHtml,
        text: baseText,
        personalized: false,
      }
    }
    const primaryEmail = contact.emails[0]?.address || input.to
    const vars = buildContactVariables(contact, primaryEmail)
    return {
      subject: applyEmailVariables(baseSubject, vars),
      html: applyEmailVariables(baseHtml, vars),
      text: applyEmailVariables(baseText, vars),
      personalized: false,
    }
  }

  if (!input.personalizePerContact || !contact) {
    // When not personalizing, subject/html/text may already be variable-replaced by Launch.
    // Prefer already-resolved fields if present and no personalize flag.
    if (!input.personalizePerContact) {
      return {
        subject: input.subject,
        html: input.html || '',
        text: input.text || '',
        personalized: false,
      }
    }
    return applyVars()
  }

  const contactName =
    contact.fullName ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
    input.to
  const companyName = contact.company?.name || 'their company'
  const productDescription =
    input.productDescription ||
    stripPlaceholders(baseText || baseHtml).slice(0, 800) ||
    'our products and services'

  try {
    const generated = await generateEmail({
      contactName,
      contactTitle: contact.title || 'decision maker',
      companyName,
      companyIndustry: contact.company?.industry || undefined,
      productDescription,
      tone: mapTone(input.tone),
      language: input.language || 'en',
      purpose: 'cold-outreach',
    })

    if (!generated.content?.trim()) {
      const fallback = applyVars()
      return { ...fallback, fallbackReason: 'empty_ai_content' }
    }

    const subject = generated.subject?.trim() || applyVars().subject
    const text = generated.content.trim()
    // Light variable pass for any leftover placeholders in AI output
    const primaryEmail = contact.emails[0]?.address || input.to
    const vars = buildContactVariables(contact, primaryEmail)
    return {
      subject: applyEmailVariables(subject, vars),
      html: applyEmailVariables(text.replace(/\n/g, '<br/>'), vars),
      text: applyEmailVariables(text, vars),
      personalized: true,
    }
  } catch (err) {
    console.warn(
      '[email-personalize] AI generation failed, falling back to variables:',
      err instanceof Error ? err.message : err
    )
    const fallback = applyVars()
    return {
      ...fallback,
      fallbackReason: err instanceof Error ? err.message : 'ai_failed',
    }
  }
}

async function loadContact(contactId: string) {
  return prisma.contact.findUnique({
    where: { id: contactId },
    include: {
      company: true,
      emails: { where: { isPrimary: true }, take: 1 },
    },
  })
}

function stripPlaceholders(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{\{[^}]+\}\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Build product description string for personalization from campaign + product */
export function buildProductDescription(campaign: {
  content?: string | null
  subject?: string | null
  product?: { name?: string | null; description?: string | null } | null
}): string {
  const parts: string[] = []
  if (campaign.product?.name) parts.push(campaign.product.name)
  if (campaign.product?.description) parts.push(campaign.product.description)
  if (parts.length === 0 && campaign.content) {
    parts.push(stripPlaceholders(campaign.content).slice(0, 600))
  }
  if (parts.length === 0 && campaign.subject) parts.push(campaign.subject)
  return parts.join('\n').slice(0, 1000) || 'our products and services'
}
