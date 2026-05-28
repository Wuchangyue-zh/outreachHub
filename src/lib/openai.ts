import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Retry wrapper for OpenAI API calls
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      if (attempt === maxRetries) throw error
      if (error?.status === 429 || error?.status === 500 || error?.status === 503) {
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

  const completion = await withRetry(() =>
    openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a professional B2B email copywriter specializing in cold outreach for Chinese exporters selling to overseas markets. Write compelling, personalized emails that get responses. Always write in the specified language.`,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })
  )

  const content = completion.choices[0]?.message?.content || ''
  return parseEmailContent(content)
}

export async function generateEmailSubject(input: {
  contactName: string
  companyName: string
  productDescription: string
  purpose?: string
  language?: string
}) {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at writing email subject lines that get opened. Generate 5 subject line options that are concise, personalized, and compelling.',
      },
      {
        role: 'user',
        content: `Write 5 email subject lines for a cold email to ${input.contactName} at ${input.companyName} about ${input.productDescription}. Purpose: ${input.purpose || 'cold outreach'}. Language: ${input.language || 'en'}. Return as a numbered list.`,
      },
    ],
    temperature: 0.8,
    max_tokens: 200,
  })

  const content = completion.choices[0]?.message?.content || ''
  return content
    .split('\n')
    .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(Boolean)
}

export async function polishEmail(content: string, tone?: string) {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a professional email copywriter. Polish and improve the given email while maintaining its core message. Make it more engaging and professional. Tone: ${tone || 'professional'}.`,
      },
      { role: 'user', content: `Polish this email:\n\n${content}` },
    ],
    temperature: 0.5,
    max_tokens: 1000,
  })

  return completion.choices[0]?.message?.content || content
}

export async function translateEmail(content: string, targetLanguage: string) {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Translate the following email to ${targetLanguage}. Maintain the tone and formatting. Only return the translated text.`,
      },
      { role: 'user', content },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  })

  return completion.choices[0]?.message?.content || content
}

export async function generateCustomerProfile(contact: {
  name: string
  title: string
  company: string
  industry?: string
  location?: string
}) {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a B2B sales analyst. Analyze the given contact information and generate a detailed customer profile including pain points, buying signals, recommended approach, and potential products to pitch.',
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
    temperature: 0.7,
    max_tokens: 800,
  })

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
