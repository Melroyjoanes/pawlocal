import { NextRequest, NextResponse, after } from 'next/server'
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
  const userAgent = req.headers.get('user-agent')
  const referrer = req.headers.get('referer')

  // Serverless functions (Vercel) freeze execution the instant a response is
  // sent — a bare fire-and-forget async call gets killed mid-flight before
  // the insert reaches Supabase, so scans silently never get logged. after()
  // tells the platform to keep the function alive to finish this specific
  // work, without delaying the redirect response itself.
  after(async () => {
    try {
      await admin()
        .from('qr_campaign_scans')
        .insert({ slug, user_agent: userAgent, referrer })
    } catch {
      // logging is best-effort only
    }
  })

  return NextResponse.redirect(buildWhatsAppUrl(campaign), { status: 302 })
}
