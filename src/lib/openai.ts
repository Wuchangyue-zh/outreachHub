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
