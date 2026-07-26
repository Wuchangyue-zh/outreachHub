import { NextResponse } from 'next/server'

const AUTH_COOKIE = 'auth-token'
const MAX_AGE = 7 * 24 * 60 * 60 // 7 days

/**
 * Only set Secure when the app is actually served over HTTPS.
 * NODE_ENV=production + HTTP (e.g. ECS IP:3030) would otherwise drop the cookie in browsers.
 */
function shouldUseSecureCookie(): boolean {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || ''
  if (appUrl.startsWith('https://')) return true
  if (appUrl.startsWith('http://')) return false
  return process.env.NODE_ENV === 'production'
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE, token, cookieOptions(MAX_AGE))
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE, '', cookieOptions(0))
}
