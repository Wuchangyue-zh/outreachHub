import OpenAI from 'openai'

const DEFAULT_ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'

let client: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || DEFAULT_ARK_BASE_URL,
    })
  }

  return client
}

function getModel(): string {
  return process.env.OPENAI_MODEL || 'doubao-seed-2-0-pro-260215'
}

async function createChatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options?: { temperature?: number; max_tokens?: number }
) {
  const openai = getOpenAIClient()

  return withRetry(() =>
    openai.chat.completions.create({
      model: getModel(),
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 1000,
    })
  )
}

// Retry wrapper for LLM API calls
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      const err = error as { status?: number }
      if (attempt === maxRetries) throw error
      if (err?.status === 429 || err?.status === 500 || err?.status === 503) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt))
        continue
      }
      throw error
    }
  }
  throw new Error('Max retries exceeded')
}

export interface EmailGenerationInput {
  contactName: string
  contactTitle: string
  companyName: string
  companyIndustry?: string
  productDescription: string
  tone?: 'professional' | 'casual' | 'friendly' | 'formal'
  language?: string
  purpose?: 'cold-outreach' | 'follow-up' | 'introduction' | 'promotion' | 'meeting-request'
}

export async function generateEmail(input: EmailGenerationInput) {
  const prompt = buildEmailPrompt(input)

  const completion = await createChatCompletion(
    [
      {
        role: 'system',
        content:
          'You are a professional B2B email copywriter specializing in cold outreach for Chinese exporters selling to overseas markets. Write compelling, personalized emails that get responses. Always write in the specified language.',
      },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.7, max_tokens: 1000 }
  )

  const content = completion.choices[0]?.message?.content || ''
  return parseEmailContent(content)
}

export async function generateCampaignEmail(productPrompt: string, tone: string) {
  const completion = await createChatCompletion(
    [
      {
        role: 'system',
        content: `You are a professional B2B cold outreach copywriter for Chinese exporters targeting overseas buyers.
Write a complete cold email template in English with a ${tone} tone.
Keep placeholders exactly as: {{FirstName}}, {{CompanyName}}, {{Industry}}, {{Country}}.
Include a subject line on the first line as: Subject: ...
Use markdown-style bullet points where appropriate.`,
      },
      {
        role: 'user',
        content: `Product/service description: ${productPrompt}

Requirements:
1. Opening personalized with {{FirstName}} and {{CompanyName}}
2. Reference {{Industry}} and {{Country}} where natural
3. Highlight value props: quality, pricing, delivery, OEM/ODM
4. Clear call-to-action
5. Professional signature block with [Your Name], [Your Title], etc.`,
      },
    ],
    { temperature: 0.7, max_tokens: 1200 }
  )

  return completion.choices[0]?.message?.content?.trim() || ''
}

export async function generateReplyDraft(input: {
  contactName: string
  company: string
  lastMessage: string
  sender?: { name: string; email: string; company?: string }
}) {
  return generateInboxReply({
    contactName: input.contactName,
    contactEmail: '',
    company: input.company,
    messages: [{ from: 'them', body: input.lastMessage, timestamp: '' }],
    mode: 'draft',
    sender: input.sender || { name: 'Sales Team', email: '', company: input.company },
  })
}

export async function generateInboxReply(input: {
  contactName: string
  contactEmail: string
  company: string
  country?: string
  intent?: string
  messages: Array<{ from: 'us' | 'them'; body: string; timestamp: string }>
  existingDraft?: string
  mode: 'draft' | 'expand'
  sender: {
    name: string
    email: string
    company?: string
  }
}) {
  const conversation = input.messages
    .map((m) => {
      const role = m.from === 'us' ? 'Sales Rep (us)' : `${input.contactName} (customer)`
      const time = m.timestamp ? ` [${m.timestamp}]` : ''
      return `${role}${time}:\n${stripHtmlForPrompt(m.body)}`
    })
    .join('\n\n---\n\n')

  const intentHint =
    input.intent === 'interested'
      ? 'The customer appears interested. Move toward scheduling a call or next step.'
      : input.intent === 'opt-out'
        ? 'The customer wants to opt out. Be polite and confirm removal from outreach.'
        : input.intent === 'ooo'
          ? 'The customer is out of office. Suggest following up later.'
          : 'Respond appropriately based on the conversation tone.'

  const signatureBlock = buildSignatureBlock(input.sender, isChineseConversation(input.messages))
  const signatureInstruction = `Sign off with this exact signature (do not use placeholders):\n${signatureBlock}`

  if (input.mode === 'expand') {
    const completion = await createChatCompletion(
      [
        {
          role: 'system',
          content:
            'You are a professional B2B sales representative. Expand and polish the draft reply using the full conversation context. Keep the same intent and language as the draft. Return only the improved email body text.',
        },
        {
          role: 'user',
          content: `Contact: ${input.contactName} (${input.contactEmail}) at ${input.company}${input.country ? `, ${input.country}` : ''}

Conversation history:
${conversation}

Draft to expand:
${input.existingDraft || ''}

Requirements:
1. Expand the draft into a complete, professional reply (under 250 words)
2. Address the customer's latest message directly
3. ${intentHint}
4. Include a clear next step
5. Match the language of the customer's latest message (Chinese or English)
6. ${signatureInstruction}
7. Do not include subject line — body only`,
        },
      ],
      { temperature: 0.7, max_tokens: 800 }
    )
    return applySenderSignature(
      completion.choices[0]?.message?.content?.trim() || input.existingDraft || '',
      input.sender
    )
  }

  const completion = await createChatCompletion(
    [
      {
        role: 'system',
        content:
          'You are a professional B2B sales representative. Write concise, helpful email replies based on the full conversation history. Use a professional but warm tone. Return only the email body text.',
      },
      {
        role: 'user',
        content: `Write a reply email to ${input.contactName} (${input.contactEmail}) at ${input.company}${input.country ? `, ${input.country}` : ''}.

You are replying as: ${input.sender.name} <${input.sender.email}>${input.sender.company ? ` from ${input.sender.company}` : ''}.

Full conversation history:
${conversation}

Requirements:
1. Read the entire thread and respond to the customer's latest message
2. Address the customer by name — never confuse the customer with the sender
3. Keep it under 200 words
4. ${intentHint}
5. Include a clear next step (e.g. schedule a call, send more info)
6. Match the language of the customer's latest message (Chinese or English)
7. ${signatureInstruction}
8. Do not include subject line — body only`,
      },
    ],
    { temperature: 0.7, max_tokens: 800 }
  )

  return applySenderSignature(
    completion.choices[0]?.message?.content?.trim() || '',
    input.sender
  )
}

function buildSignatureBlock(
  sender: { name: string; email: string; company?: string },
  chinese = false
): string {
  const lines = chinese ? ['此致敬礼', sender.name] : ['Best regards,', sender.name]
  if (sender.company) lines.push(sender.company)
  lines.push(sender.email)
  return lines.join('\n')
}

function isChineseConversation(
  messages: Array<{ from: 'us' | 'them'; body: string }>
): boolean {
  const lastCustomer = [...messages].reverse().find((m) => m.from === 'them')
  if (!lastCustomer) return false
  return /[\u4e00-\u9fff]/.test(stripHtmlForPrompt(lastCustomer.body))
}

function applySenderSignature(
  text: string,
  sender: { name: string; email: string; company?: string }
): string {
  let result = text
  const placeholders = [
    '[你的姓名]',
    '[您的姓名]',
    '[Your Name]',
    '[Your Full Name]',
    '[NAME]',
    '[Name]',
  ]
  for (const placeholder of placeholders) {
    result = result.split(placeholder).join(sender.name)
  }
  return result
}

function stripHtmlForPrompt(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, 2000)
}

export async function generateEmailSubject(input: {
  contactName: string
  companyName: string
  productDescription: string
  purpose?: string
  language?: string
}) {
  const completion = await createChatCompletion(
    [
      {
        role: 'system',
        content:
          'You are an expert at writing email subject lines that get opened. Generate 5 subject line options that are concise, personalized, and compelling.',
      },
      {
        role: 'user',
        content: `Write 5 email subject lines for a cold email to ${input.contactName} at ${input.companyName} about ${input.productDescription}. Purpose: ${input.purpose || 'cold outreach'}. Language: ${input.language || 'en'}. Return as a numbered list.`,
      },
    ],
    { temperature: 0.8, max_tokens: 200 }
  )

  const content = completion.choices[0]?.message?.content || ''
  return content
    .split('\n')
    .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(Boolean)
}

export async function polishEmail(content: string, tone?: string) {
  const completion = await createChatCompletion(
    [
      {
        role: 'system',
        content: `You are a professional email copywriter. Polish and improve the given email while maintaining its core message. Make it more engaging and professional. Tone: ${tone || 'professional'}.`,
      },
      { role: 'user', content: `Polish this email:\n\n${content}` },
    ],
    { temperature: 0.5, max_tokens: 1000 }
  )

  return completion.choices[0]?.message?.content || content
}

export async function translateEmail(content: string, targetLanguage: string) {
  const completion = await createChatCompletion(
    [
      {
        role: 'system',
        content: `Translate the following email to ${targetLanguage}. Maintain the tone and formatting. Only return the translated text.`,
      },
      { role: 'user', content },
    ],
    { temperature: 0.3, max_tokens: 1000 }
  )

  return completion.choices[0]?.message?.content || content
}

export async function generateCustomerProfile(contact: {
  name: string
  title: string
  company: string
  industry?: string
  location?: string
}) {
  const completion = await createChatCompletion(
    [
      {
        role: 'system',
        content:
          'You are a B2B sales analyst. Analyze the given contact information and generate a detailed customer profile including pain points, buying signals, recommended approach, and potential products to pitch.',
      },
      {
        role: 'user',
        content: `Generate a customer profile for:
Name: ${contact.name}
Title: ${contact.title}
Company: ${contact.company}
Industry: ${contact.industry || 'N/A'}
Location: ${contact.location || 'N/A'}

Return a structured analysis with:
1. Decision-making power assessment
2. Likely pain points and needs
3. Recommended approach and messaging
4. Best timing for outreach
5. Products/services that would be most relevant`,
      },
    ],
    { temperature: 0.7, max_tokens: 800 }
  )

  return completion.choices[0]?.message?.content || ''
}

/**
 * #27: AI 拓词建议 — 根据行业/产品生成相关搜索关键词
 */
export async function generateKeywordSuggestions(input: {
  industry: string
  productDescription?: string
  existingKeywords?: string[]
}): Promise<string[]> {
  const completion = await createChatCompletion(
    [
      {
        role: 'system',
        content: 'You are a B2B market research expert. Generate targeted search keywords for finding potential business leads. Return a JSON array of keyword strings, nothing else.',
      },
      {
        role: 'user',
        content: `Industry: ${input.industry}
${input.productDescription ? `Product: ${input.productDescription}` : ''}
${input.existingKeywords?.length ? `Existing keywords: ${input.existingKeywords.join(', ')}` : ''}

Generate 10-15 search keywords (English) that would help find potential buyers/importers in this industry. Focus on:
1. Product category names
2. Industry-specific terms
3. Buyer role titles
4. Trade/commerce terms

Return ONLY a JSON array of strings, e.g. ["keyword1", "keyword2"]`,
      },
    ],
    { temperature: 0.8, max_tokens: 400 }
  )

  try {
    const content = completion.choices[0]?.message?.content || '[]'
    const match = content.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}

/**
 * #27: AI 职位建议 — 根据目标行业生成相关决策者职位
 */
export async function generatePositionSuggestions(input: {
  industry: string
  targetLevel?: string
}): Promise<string[]> {
  const completion = await createChatCompletion(
    [
      {
        role: 'system',
        content: 'You are a B2B sales strategist. Generate job title suggestions for targeting decision makers. Return a JSON array of title strings, nothing else.',
      },
      {
        role: 'user',
        content: `Industry: ${input.industry}
Target level: ${input.targetLevel || 'decision makers'}

Generate 8-12 job titles (English) that are key decision makers or influencers for B2B purchasing in this industry. Include:
1. C-level executives
2. VP/Director level
3. Department heads
4. Procurement/purchasing roles

Return ONLY a JSON array of strings.`,
      },
    ],
    { temperature: 0.8, max_tokens: 300 }
  )

  try {
    const content = completion.choices[0]?.message?.content || '[]'
    const match = content.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}

function buildEmailPrompt(input: EmailGenerationInput): string {
  const languageMap: Record<string, string> = {
    en: 'English',
    zh: 'Chinese',
    de: 'German',
    fr: 'French',
    es: 'Spanish',
    ja: 'Japanese',
    ko: 'Korean',
    pt: 'Portuguese',
    ru: 'Russian',
    ar: 'Arabic',
  }

  const lang = languageMap[input.language || 'en'] || 'English'
  const tone = input.tone || 'professional'
  const purpose = input.purpose || 'cold-outreach'

  return `Write a ${purpose === 'cold-outreach' ? 'cold outreach' : purpose} email in ${lang} with a ${tone} tone.

Contact: ${input.contactName}
Title: ${input.contactTitle}
Company: ${input.companyName}
Industry: ${input.companyIndustry || 'Not specified'}

Our Product/Service: ${input.productDescription}

Requirements:
1. Personalize the opening with the contact's name and company
2. Keep it under 150 words
3. Include a clear call-to-action
4. Be concise and value-focused
5. Avoid overly salesy language
6. Reference industry-specific pain points if possible

Return the email with a compelling subject line at the top, formatted as:
Subject: [subject line]

[email body]`
}

function parseEmailContent(raw: string): { subject: string; content: string } {
  const subjectMatch = raw.match(/Subject:\s*(.+)/i)
  const subject = subjectMatch ? subjectMatch[1].trim() : ''
  const content = subjectMatch
    ? raw.replace(/Subject:\s*.+\n?\n?/i, '').trim()
    : raw.trim()

  return { subject, content }
}
