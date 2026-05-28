export type ReplyCategory =
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'OUT_OF_OFFICE'
  | 'QUESTION'
  | 'UNSUBSCRIBE'
  | 'AUTO_REPLY'
  | 'FORWARD'
  | 'NEGOTIATION'
  | 'REFERRAL'
  | 'UNKNOWN'

export interface ClassificationResult {
  category: ReplyCategory
  confidence: number
  keywords: string[]
  summary: string
}

const categoryPatterns: Record<ReplyCategory, { keywords: string[]; phrases: string[]; weight: number }> = {
  INTERESTED: {
    keywords: ['interested', 'yes', 'sure', 'sounds good', 'great', 'perfect', 'let\'s', 'schedule', 'meeting', 'call', 'demo', 'learn more', 'tell me more', 'more information'],
    phrases: ['i\'m interested', 'would love to', 'let\'s set up', 'when can we', 'sounds interesting', 'tell me more', 'i\'d like to learn', 'sign me up', 'count me in'],
    weight: 1.0,
  },
  NOT_INTERESTED: {
    keywords: ['not interested', 'no thanks', 'pass', 'decline', 'reject', 'remove', 'stop', 'unsubscribe', 'don\'t contact', 'no longer'],
    phrases: ['not interested', 'no thank you', 'please remove', 'don\'t contact me', 'stop emailing', 'not a good fit', 'we\'re good', 'pass on this', 'decline'],
    weight: 0.9,
  },
  OUT_OF_OFFICE: {
    keywords: ['out of office', 'ooo', 'away', 'unavailable', 'vacation', 'holiday', 'back on', 'return on', 'automatic'],
    phrases: ['out of office', 'i am away', 'on vacation', 'on holiday', 'currently unavailable', 'automatic reply', 'auto-reply', 'back in the office', 'return to office'],
    weight: 0.95,
  },
  QUESTION: {
    keywords: ['?', 'how', 'what', 'when', 'where', 'why', 'who', 'which', 'pricing', 'cost', 'price', 'details', 'explain', 'clarify', 'wondering'],
    phrases: ['can you explain', 'how does', 'what is', 'could you clarify', 'i have a question', 'wondering if', 'would like to know', 'tell me about', 'more details'],
    weight: 0.7,
  },
  UNSUBSCRIBE: {
    keywords: ['unsubscribe', 'opt out', 'remove me', 'stop sending', 'spam', 'junk', 'block'],
    phrases: ['please unsubscribe', 'remove from list', 'stop sending me', 'opt out of', 'don\'t send', 'mark as spam', 'this is spam'],
    weight: 0.95,
  },
  AUTO_REPLY: {
    keywords: ['automatic', 'auto-reply', 'do not reply', 'noreply', 'mailer-daemon', 'delivery failed', 'bounced', 'undeliverable'],
    phrases: ['this is an automatic', 'do not reply', 'auto-generated', 'delivery status notification', 'message could not be delivered', 'mail delivery failed'],
    weight: 0.9,
  },
  FORWARD: {
    keywords: ['forwarded', 'fwd', 'forwarding', 'passing along', 'sharing this', 'thought you might'],
    phrases: ['forwarded message', 'fwd:', 'thought you might be interested', 'passing this along', 'sharing with you'],
    weight: 0.6,
  },
  NEGOTIATION: {
    keywords: ['negotiate', 'discount', 'deal', 'offer', 'proposal', 'counter', 'terms', 'contract', 'pricing', 'budget', 'afford'],
    phrases: ['can you offer', 'what\'s the best price', 'negotiate terms', 'counter offer', 'better deal', 'discount available', 'within our budget', 'payment terms'],
    weight: 0.8,
  },
  REFERRAL: {
    keywords: ['referral', 'refer', 'introduce', 'connect you', 'colleague', 'someone else', 'better person', 'right contact', 'cc\'d'],
    phrases: ['let me refer', 'introduce you to', 'connect you with', 'speak with', 'better person to talk to', 'forwarding to', 'cc\'ing', 'my colleague'],
    weight: 0.7,
  },
  UNKNOWN: {
    keywords: [],
    phrases: [],
    weight: 0.0,
  },
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findMatches(text: string, keywords: string[], phrases: string[]): string[] {
  const matches: string[] = []
  const normalized = normalizeText(text)

  for (const keyword of keywords) {
    if (normalized.includes(keyword.toLowerCase())) {
      matches.push(keyword)
    }
  }

  for (const phrase of phrases) {
    if (normalized.includes(phrase.toLowerCase())) {
      matches.push(phrase)
    }
  }

  return [...new Set(matches)]
}

function calculateConfidence(
  category: ReplyCategory,
  matches: string[],
  textLength: number
): number {
  if (matches.length === 0) return 0

  const { weight } = categoryPatterns[category]
  const matchScore = Math.min(matches.length / 3, 1) // Cap at 3 matches
  const lengthFactor = Math.min(textLength / 100, 1) // Longer text = more reliable

  return Math.min(matchScore * weight * (0.7 + 0.3 * lengthFactor), 1)
}

function generateSummary(category: ReplyCategory, matches: string[]): string {
  const summaries: Record<ReplyCategory, string> = {
    INTERESTED: '收件人表示感兴趣，可能希望进一步了解或安排会议',
    NOT_INTERESTED: '收件人表示不感兴趣，建议标记为不再联系',
    OUT_OF_OFFICE: '收件人不在办公室，稍后需要重新跟进',
    QUESTION: '收件人提出了问题，需要回复解答',
    UNSUBSCRIBE: '收件人要求退订，必须立即处理',
    AUTO_REPLY: '系统自动回复，无需人工处理',
    FORWARD: '邮件已被转发给其他人',
    NEGOTIATION: '收件人希望协商价格或条款',
    REFERRAL: '收件人推荐了其他联系人',
    UNKNOWN: '无法确定邮件意图',
  }

  return summaries[category]
}

export function classifyReply(text: string, subject: string = ''): ClassificationResult {
  const combinedText = `${subject} ${text}`
  const results: Array<{ category: ReplyCategory; confidence: number; matches: string[] }> = []

  for (const [category, { keywords, phrases }] of Object.entries(categoryPatterns)) {
    if (category === 'UNKNOWN') continue

    const matches = findMatches(combinedText, keywords, phrases)
    if (matches.length > 0) {
      const confidence = calculateConfidence(category as ReplyCategory, matches, combinedText.length)
      results.push({
        category: category as ReplyCategory,
        confidence,
        matches,
      })
    }
  }

  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence)

  if (results.length === 0 || results[0].confidence < 0.3) {
    return {
      category: 'UNKNOWN',
      confidence: 0,
      keywords: [],
      summary: generateSummary('UNKNOWN', []),
    }
  }

  const best = results[0]
  return {
    category: best.category,
    confidence: best.confidence,
    keywords: best.matches,
    summary: generateSummary(best.category, best.matches),
  }
}

export function getCategoryLabel(category: ReplyCategory): string {
  const labels: Record<ReplyCategory, string> = {
    INTERESTED: '感兴趣',
    NOT_INTERESTED: '不感兴趣',
    OUT_OF_OFFICE: '不在办公室',
    QUESTION: '提问',
    UNSUBSCRIBE: '退订',
    AUTO_REPLY: '自动回复',
    FORWARD: '已转发',
    NEGOTIATION: '协商中',
    REFERRAL: '转介绍',
    UNKNOWN: '未知',
  }
  return labels[category]
}

export function getCategoryColor(category: ReplyCategory): string {
  const colors: Record<ReplyCategory, string> = {
    INTERESTED: '#27ae60',
    NOT_INTERESTED: '#e74c3c',
    OUT_OF_OFFICE: '#f39c12',
    QUESTION: '#3498db',
    UNSUBSCRIBE: '#e74c3c',
    AUTO_REPLY: '#95a5a6',
    FORWARD: '#9b59b6',
    NEGOTIATION: '#f39c12',
    REFERRAL: '#1abc9c',
    UNKNOWN: '#7f8c8d',
  }
  return colors[category]
}
