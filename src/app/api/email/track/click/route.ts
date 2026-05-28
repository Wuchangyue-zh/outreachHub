import { NextRequest, NextResponse } from 'next/server'
import { recordEmailClick } from '@/lib/email-tracking'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const emailLogId = req.nextUrl.searchParams.get('e')
    const contactId = req.nextUrl.searchParams.get('c')
    const url = req.nextUrl.searchParams.get('u')

    // Record the click event asynchronously
    if (emailLogId && contactId && url) {
      recordEmailClick(emailLogId, contactId, url).catch(console.error)
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
