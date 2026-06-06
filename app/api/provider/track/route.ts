import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Module-level dedup: key = "ip:provider_id:event_type:YYYY-MM-DD"
// Prevents spam clicks from counting as multiple analytics events
const recentEvents = new Map<string, number>()
const DEDUP_WINDOW_MS = 30 * 60 * 1000 // 30 minutes

function isDuplicate(ip: string, providerId: string, eventType: string): boolean {
  const day = new Date().toISOString().slice(0, 10)
  const key = `${ip}:${providerId}:${eventType}:${day}`
  const last = recentEvents.get(key)
  if (last && Date.now() - last < DEDUP_WINDOW_MS) return true
  recentEvents.set(key, Date.now())
  // Clean old entries every ~100 inserts to prevent memory leak
  if (recentEvents.size > 5000) {
    const cutoff = Date.now() - DEDUP_WINDOW_MS
    for (const [k, v] of recentEvents.entries()) {
      if (v < cutoff) recentEvents.delete(k)
    }
  }
  return false
}

async function sendLeadEmail(providerId: string) {
  if (!process.env.RESEND_API_KEY) return

  const supabase = adminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider } = await (supabase.from('providers') as any)
    .select('id, name, category_slug, email')
    .eq('id', providerId)
    .single()

  if (!provider?.email) return // not claimed yet — can't email

  const profileUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pawlocal-ashen.vercel.app'}/provider/${providerId}`
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pawlocal-ashen.vercel.app'}/pro/dashboard`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'PawLocal <onboarding@resend.dev>',
      to: provider.email,
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

          <a href="${dashboardUrl}" style="display: block; text-align: center; background: oklch(0.48 0.17 196); color: white; font-weight: 700; font-size: 14px; padding: 14px; border-radius: 12px; text-decoration: none; margin-bottom: 12px;">
            View Dashboard →
          </a>
          <a href="${profileUrl}" style="display: block; text-align: center; background: white; color: #374151; font-weight: 600; font-size: 14px; padding: 14px; border-radius: 12px; text-decoration: none; border: 1px solid #E5E7EB;">
            View Profile
          </a>

          <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin-top: 20px; margin-bottom: 0;">
            PawLocal · Juhu, Mumbai
          </p>
        </div>
      `,
    }),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  try {
    const { provider_id, event_type } = await req.json()

    if (!provider_id || !['view', 'whatsapp_click', 'call_click'].includes(event_type)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Get client IP for dedup
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown'

    if (isDuplicate(ip, provider_id, event_type)) {
      return NextResponse.json({ ok: true, deduped: true })
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
      sendLeadEmail(provider_id).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
