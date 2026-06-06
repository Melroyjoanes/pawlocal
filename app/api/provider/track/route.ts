import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function sendLeadEmail(providerId: string) {
  if (!process.env.RESEND_API_KEY) return

  const supabase = adminClient()

  // Fetch provider + linked user
  const { data: provider } = await supabase
    .from('providers')
    .select('id, name, category_slug, user_id, whatsapp')
    .eq('id', providerId)
    .single()

  if (!provider?.user_id) return // not claimed yet — can't email

  // Get user's email from Supabase auth
  const { data: { user } } = await supabase.auth.admin.getUserById(provider.user_id)
  const email = user?.email
  if (!email) return

  const profileUrl = `https://pawlocal.in/provider/${providerId}`
  const dashboardUrl = `https://pawlocal.in/provider/${providerId}/dashboard`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'PawLocal <hello@pawlocal.in>',
      to: email,
      subject: `🐾 Someone is interested in your services, ${provider.name.split(' ')[0]}!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; background: #FFFBEB; padding: 32px 24px; border-radius: 24px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 48px; margin-bottom: 12px;">🐾</div>
            <h1 style="font-size: 22px; font-weight: 800; color: #451A03; margin: 0 0 8px;">You have a new lead!</h1>
            <p style="font-size: 14px; color: #78716C; margin: 0;">Someone just clicked your WhatsApp on PawLocal</p>
          </div>

          <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid #E5E7EB;">
            <p style="font-size: 13px; color: #6B7280; margin: 0 0 4px;">What happened</p>
            <p style="font-size: 15px; font-weight: 600; color: #111827; margin: 0;">
              A pet owner in Juhu clicked your WhatsApp button — they're likely about to message you.
            </p>
          </div>

          <div style="background: #F0FDF4; border-radius: 16px; padding: 20px; margin-bottom: 24px; border: 1px solid #BBF7D0;">
            <p style="font-size: 13px; color: #065F46; font-weight: 600; margin: 0 0 8px;">💡 What to do now</p>
            <ul style="font-size: 14px; color: #047857; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Keep your WhatsApp notifications on</li>
              <li>Reply quickly — first response wins the booking</li>
              <li>Keep your availability up to date</li>
            </ul>
          </div>

          <div style="display: flex; gap: 12px; margin-bottom: 24px;">
            <a href="${dashboardUrl}" style="flex: 1; display: block; text-align: center; background: linear-gradient(160deg, #FCD34D, #F59E0B); color: #451A03; font-weight: 700; font-size: 14px; padding: 14px; border-radius: 12px; text-decoration: none;">
              View Dashboard →
            </a>
            <a href="${profileUrl}" style="flex: 1; display: block; text-align: center; background: white; color: #374151; font-weight: 600; font-size: 14px; padding: 14px; border-radius: 12px; text-decoration: none; border: 1px solid #E5E7EB;">
              View Profile
            </a>
          </div>

          <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin: 0;">
            PawLocal · Juhu, Mumbai · <a href="${profileUrl}" style="color: #9CA3AF;">Unsubscribe</a>
          </p>
        </div>
      `,
    }),
  }).catch(() => {}) // non-critical — don't fail the track event
}

export async function POST(req: NextRequest) {
  try {
    const { provider_id, event_type } = await req.json()

    if (!provider_id || !['view', 'whatsapp_click', 'call_click'].includes(event_type)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const supabase = adminClient()
    const { error } = await supabase
      .from('provider_analytics')
      .insert({ provider_id, event_type })

    if (error) {
      return NextResponse.json({ ok: false })
    }

    // Send lead notification email when someone clicks WhatsApp
    if (event_type === 'whatsapp_click') {
      // Fire-and-forget — don't await, don't block the response
      sendLeadEmail(provider_id).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
