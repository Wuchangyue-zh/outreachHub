import { NextRequest, NextResponse } from 'next/server'

const AUTH_COOKIE = 'auth-token'
const MAX_AGE = 7 * 24 * 60 * 60 // 7 days

function stripEnvQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/**
 * Only set Secure when the app is actually served over HTTPS.
 * ECS IP:3030 is plain HTTP — Secure cookies are dropped by browsers, causing
 * "login success but stuck on login page".
 */
export function shouldUseSecureCookie(req?: NextRequest): boolean {
  // Explicit override for HTTP-only deploys: COOKIE_SECURE=false
  const override = process.env.COOKIE_SECURE?.trim().toLowerCase()
  if (override === 'true' || override === '1') return true
  if (override === 'false' || override === '0') return false

  const appUrl = stripEnvQuotes(process.env.APP_URL || process.env.NEXTAUTH_URL || '')
  if (appUrl.startsWith('https://')) return true
  if (appUrl.startsWith('http://')) return false

  if (req) {
    const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
    if (proto === 'https') return true
    if (proto === 'http') return false
    try {
      if (new URL(req.url).protocol === 'https:') return true
      if (new URL(req.url).protocol === 'http:') return false
    } catch {
      // ignore
    }
  }

  // Safe default: never force Secure (HTTP ECS / IP deploys)
  return false
}

function cookieOptions(maxAge: number, req?: NextRequest) {
  return {
    httpOnly: true,
    secure: shouldUseSecureCookie(req),
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }
}

export function setAuthCookie(
  response: NextResponse,
  token: string,
  req?: NextRequest
): void {
  response.cookies.set(AUTH_COOKIE, token, cookieOptions(MAX_AGE, req))
}

export function clearAuthCookie(response: NextResponse, req?: NextRequest): void {
  response.cookies.set(AUTH_COOKIE, '', cookieOptions(0, req))
}
