import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

// Print-ready QR PNG for a campaign slug — encodes /qr/{slug} (the tracking
// redirect), never a raw wa.me link, so scans get logged before WhatsApp
// opens. High error-correction level ('H') leaves room to overlay a small
// logo/paw badge later without breaking scannability, even though this
// version doesn't draw one.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'
  const targetUrl = `${siteUrl}/qr/${slug}`

  const buffer = await QRCode.toBuffer(targetUrl, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 1200,
    color: {
      dark: '#0A2F35',
      light: '#FFFFFF',
    },
  })

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename="pupstep-qr-${slug}.png"`,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
