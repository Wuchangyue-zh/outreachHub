import { NextRequest, NextResponse } from 'next/server'
import { generateTrackingPixel, recordEmailOpen } from '@/lib/email-tracking'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const emailLogId = req.nextUrl.searchParams.get('e')
    const contactId = req.nextUrl.searchParams.get('c')

    // K2: 提取 IP 和国家（Vercel/Cloudflare headers）
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined
    const country = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || undefined
    const city = req.headers.get('x-vercel-ip-city') || undefined

    // Record the open event asynchronously
    if (emailLogId && contactId) {
      recordEmailOpen(emailLogId, contactId, { ip, country, city }).catch(console.error)
    }

    // Return tracking pixel
    const pixel = generateTrackingPixel()
    return new NextResponse(new Uint8Array(pixel), {
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
    return new NextResponse(new Uint8Array(pixel), {
      status: 200,
      headers: { 'Content-Type': 'image/gif' },
    })
  }
}
