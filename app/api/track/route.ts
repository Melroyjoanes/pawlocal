import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const ALLOWED_EVENTS = new Set([
  'report_viewed', 'viral_hook_tapped', 'invite_link_clicked',
  'invite_sent', 'onboarding_completed',
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event_type, invite_token, report_token, metadata } = body

    if (!event_type || !ALLOWED_EVENTS.has(event_type)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? null
    const user_agent = req.headers.get('user-agent') ?? null
    const referrer_url = req.headers.get('referer') ?? null

    await admin().from('analytics_events').insert({
      event_type,
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      user_name: user?.user_metadata?.full_name ?? null,
      invite_token: invite_token ?? null,
      report_token: report_token ?? null,
      referrer_url,
      ip_address: ip,
      user_agent,
      metadata: metadata ?? {},
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
