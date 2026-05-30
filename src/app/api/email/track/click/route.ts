import { NextRequest, NextResponse } from 'next/server'
import { recordEmailClick } from '@/lib/email-tracking'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const emailLogId = req.nextUrl.searchParams.get('e')
    const contactId = req.nextUrl.searchParams.get('c')
    const url = req.nextUrl.searchParams.get('u')

    // L3: 提取 IP 和国家
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined
    const country = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || undefined

    // Record the click event asynchronously
    if (emailLogId && contactId && url) {
      recordEmailClick(emailLogId, contactId, url, { ip, country }).catch(console.error)
    }

    // Redirect to the original URL
    if (url) {
      return NextResponse.redirect(url, { status: 302 })
    }

    // If no URL provided, return a simple message
    return new NextResponse('Click tracked', { status: 200 })
  } catch (error) {
    console.error('Email click tracking error:', error)
    // Still try to redirect even if tracking fails
    const url = req.nextUrl.searchParams.get('u')
    if (url) {
      return NextResponse.redirect(url, { status: 302 })
    }
    return new NextResponse('Tracking error', { status: 500 })
  }
}
