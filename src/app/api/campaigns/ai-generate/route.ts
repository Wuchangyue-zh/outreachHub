import { NextResponse } from 'next/server'

// ─── Mock AI email generation ────────────────────────────────
// Simulates a ~2.5s LLM call, returns a realistic cold outreach email.
// Will be replaced by real OpenAI integration later.

const TONE_INTROS: Record<string, string> = {
  professional: 'I hope this email finds you well.',
  warm: "It's great to connect with forward-thinking companies like yours!",
  concise: 'I will keep this brief.',
  urgent: 'I wanted to reach out before the Q4 sourcing window closes.',
}

const TONE_CLOSINGS: Record<string, string> = {
  professional:
    'I would welcome the opportunity to discuss how we can support your sourcing needs. Please let me know a convenient time for a brief call.',
  warm:
    "I'd love to learn more about your current needs and explore how we can work together. Feel free to reply anytime — I'm here to help!",
  concise:
    'Happy to share our catalog and pricing. Just reply with your requirements.',
  urgent:
    'Our production slots for Q4 are filling up fast. I would appreciate your earliest reply so we can reserve capacity for your order.',
}

function generateMockEmail(productPrompt: string, tone: string): string {
  const intro = TONE_INTROS[tone] || TONE_INTROS.professional
  const closing = TONE_CLOSINGS[tone] || TONE_CLOSINGS.professional

  return `Subject: Partnership Opportunity — {{CompanyName}} × Your Company

Dear {{FirstName}},

${intro}

I am reaching out from {{CompanyName}} because we noticed your strong presence in the {{Industry}} sector in {{Country}}. We specialize in ${productPrompt || 'high-quality industrial products'} and believe there is a excellent synergy between our companies.

Here is what sets us apart:

• **Quality Certified** — Our products meet international standards including ISO 9001 and IATF 16949, ensuring consistent quality for demanding markets.
• **Competitive Pricing** — Direct factory pricing with transparent cost breakdowns, helping you improve margins by 15–25%.
• **Fast Delivery** — Standard lead time of 15–20 days, with express options available for urgent orders.
• **OEM/ODM Support** — Full customization capability from design to packaging, tailored to your market requirements.

We currently serve over 200 clients across 30+ countries and maintain a 98% on-time delivery rate.

${closing}

Best regards,
[Your Name]
[Your Title]
[Company Name]
[Phone] | [Email]`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productPrompt, tone } = body

    if (!productPrompt?.trim()) {
      return NextResponse.json(
        { success: false, error: '请输入产品描述' },
        { status: 400 },
      )
    }

    // Simulate LLM latency (2–3s)
    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1000))

    const email = generateMockEmail(productPrompt, tone || 'professional')

    return NextResponse.json({
      success: true,
      data: { email },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: '生成失败，请重试' },
      { status: 500 },
    )
  }
}
