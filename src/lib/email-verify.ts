import axios from 'axios'

const BASE_URL = 'https://api.millionverifier.com/api/v3'
const API_KEY = process.env.MILLION_VERIFIER_API_KEY

export interface EmailVerificationResult {
  email: string
  status: 'valid' | 'invalid' | 'catch-all' | 'unknown'
  subResult?: string
  reason?: string
}

export async function verifyEmail(email: string): Promise<EmailVerificationResult> {
  if (!API_KEY) {
    return { email, status: 'unknown', reason: 'API key not configured' }
  }

  try {
    const response = await axios.get(`${BASE_URL}/verify`, {
      params: {
        apikey: API_KEY,
        email,
        timeout: 10,
      },
    })

    const data = response.data
    return {
      email,
      status: data.result || 'unknown',
      subResult: data.subresult,
      reason: data.reason,
    }
  } catch (error) {
    return { email, status: 'unknown', reason: 'Verification service unavailable' }
  }
}

export async function verifyBatchEmails(emails: string[]): Promise<EmailVerificationResult[]> {
  if (!API_KEY || emails.length === 0) return []

  // MillionVerifier supports batch verification via upload
  // For now, verify individually (with rate limiting)
  const results: EmailVerificationResult[] = []

  for (const email of emails) {
    const result = await verifyEmail(email)
    results.push(result)
    // Rate limit: 100ms between requests to avoid being throttled
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return results
}
