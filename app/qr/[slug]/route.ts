import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCampaign, buildWhatsAppUrl } from '@/lib/qrCampaigns'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// A printed QR encodes /qr/{slug}, never a raw wa.me link, so every scan can
// be logged before handing off to WhatsApp — otherwise a poster QR gives
// zero visibility into whether anyone's actually scanning it.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const campaign = getCampaign(slug)

  // Fire-and-forget: never let a logging failure block the redirect —
  // someone standing at a vet clinic waiting for WhatsApp to open should
  // never see a broken link because of our own analytics.
  ;(async () => {
    try {
      await admin()
        .from('qr_campaign_scans')
        .insert({
          slug,
          user_agent: req.headers.get('user-agent'),
          referrer: req.headers.get('referer'),
        })
    } catch {
      // logging is best-effort only
    }
  })()

  return NextResponse.redirect(buildWhatsAppUrl(campaign), { status: 302 })
}
