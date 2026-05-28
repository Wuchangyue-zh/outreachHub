import { NextRequest, NextResponse } from 'next/server'
import { generateTrackingPixel, recordEmailOpen } from '@/lib/email-tracking'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const emailLogId = req.nextUrl.searchParams.get('e')
    const contactId = req.nextUrl.searchParams.get('c')

    // Record the open event asynchronously
    if (emailLogId && contactId) {
      recordEmailOpen(emailLogId, contactId).catch(console.error)
    }

    // Return tracking pixel
    const pixel = generateTrackingPixel()
    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Email open tracking error:', error)
    // Still return pixel even if tracking fails
    const pixel = generateTrackingPixel()
    return new NextResponse(pixel, {
      status: 200,
      headers: { 'Content-Type': 'image/gif' },
    })
  }
}
