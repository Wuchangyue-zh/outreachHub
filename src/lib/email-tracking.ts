import { prisma } from '@/lib/prisma'

const TRACKING_BASE_URL = process.env.APP_URL || 'http://localhost:3030'

// Generate a 1x1 transparent tracking pixel
export function generateTrackingPixel(): Buffer {
  // 1x1 transparent GIF
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  )
  return pixel
}

// Wrap email content with tracking pixel and replace links with tracking URLs
export function addEmailTracking(
  htmlContent: string,
  emailLogId: string,
  contactId: string,
  campaignId?: string
): string {
  // Generate tracking pixel
  const pixelUrl = `${TRACKING_BASE_URL}/api/email/track/open?e=${emailLogId}&c=${contactId}&t=${Date.now()}`
  const trackingPixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`

  // Generate unsubscribe link
  const unsubscribeUrl = `${TRACKING_BASE_URL}/api/unsubscribe?cid=${contactId}&lid=${emailLogId}${campaignId ? `&camp=${campaignId}` : ''}`
  const unsubscribeFooter = `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af;">
  <p>如果您不想再收到此类邮件，可以 <a href="${unsubscribeUrl}" style="color: #6366f1; text-decoration: underline;">退订</a></p>
</div>`

  // Replace all links with tracking URLs
  let trackedContent = htmlContent.replace(
    /href="([^"]+)"/g,
    (match, url) => {
      // Skip internal links, mailto/tel links, and unsubscribe links
      if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:') || url.includes('/unsubscribe')) {
        return match
      }

      const trackingUrl = `${TRACKING_BASE_URL}/api/email/track/click?e=${emailLogId}&c=${contactId}&u=${encodeURIComponent(url)}`
      return `href="${trackingUrl}"`
    }
  )

  // Append unsubscribe footer and tracking pixel before closing body tag
  if (trackedContent.includes('</body>')) {
    trackedContent = trackedContent.replace('</body>', `${unsubscribeFooter}${trackingPixel}</body>`)
  } else {
    trackedContent += unsubscribeFooter + trackingPixel
  }

  return trackedContent
}

// Record email open event
export async function recordEmailOpen(emailLogId: string, contactId: string) {
  try {
    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailLogId },
    })

    if (!emailLog) {
      console.error('Email log not found:', emailLogId)
      return
    }

    // Update email log
    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: {
        status: emailLog.status === 'SENT' || emailLog.status === 'DELIVERED' ? 'OPENED' : emailLog.status,
        openedAt: emailLog.openedAt || new Date(),
        openedCount: { increment: 1 },
      },
    })

    // Update contact statistics
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        emailsOpened: { increment: 1 },
        lastEmailOpenedAt: new Date(),
      },
    })

    console.log(`Email open recorded: ${emailLogId}`)
  } catch (error) {
    console.error('Error recording email open:', error)
  }
}

// Record email click event
export async function recordEmailClick(emailLogId: string, contactId: string, url: string) {
  try {
    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailLogId },
    })

    if (!emailLog) {
      console.error('Email log not found:', emailLogId)
      return
    }

    // Update email log
    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: {
        clickedAt: emailLog.clickedAt || new Date(),
        clickedCount: { increment: 1 },
      },
    })

    // Update contact statistics
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        lastEmailOpenedAt: new Date(),
      },
    })

    console.log(`Email click recorded: ${emailLogId} -> ${url}`)
  } catch (error) {
    console.error('Error recording email click:', error)
  }
}
