import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value

  const protectedPaths = [
    '/dashboard',
    '/contacts',
    '/companies',
    '/campaigns',
    '/templates',
    '/tasks',
    '/settings',
    '/prospecting',
  ]

  const isProtectedPath = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  )

  // Redirect unauthenticated users to login
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from login/register
  if (token && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register')) {
    // Simple token existence check (full validation done in API routes)
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Add token to request headers for API routes to use
  if (token) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-auth-token', token)
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/contacts/:path*',
    '/companies/:path*',
    '/campaigns/:path*',
    '/templates/:path*',
    '/tasks/:path*',
    '/settings/:path*',
    '/prospecting/:path*',
    '/login',
    '/register',
    '/api/:path*',
  ],
}