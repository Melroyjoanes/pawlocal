import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'

const SERVICE_LABELS: Record<string, { icon: string; label: string }> = {
  'dog-walking':  { icon: '🦮', label: 'Dog Walking' },
  'grooming':     { icon: '✂️', label: 'Grooming' },
  'vet':          { icon: '🏥', label: 'Vet' },
  'pet-store':    { icon: '🛍️', label: 'Pet Store' },
  'dog-training': { icon: '🎯', label: 'Dog Training' },
}

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data, error } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const {
    service_slug, pet_description, area,
    date_needed, budget, poster_name, poster_whatsapp, notes,
  } = await req.json()

  if (!service_slug || !pet_description || !area || !date_needed || !poster_name || !poster_whatsapp) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const digits = poster_whatsapp.replace(/\D/g, '')
  if (digits.length < 10) {
    return NextResponse.json({ error: 'Invalid WhatsApp number' }, { status: 400 })
  }

  const { error } = await supabase.from('broadcasts').insert({
    service_slug,
    pet_description: pet_description.trim(),
    area: area.trim(),
    date_needed: date_needed.trim(),
    budget: budget?.trim() || null,
    poster_name: poster_name.trim(),
    poster_whatsapp: digits,
    notes: notes?.trim() || null,
  } as never)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Email notification to admin — fire and forget
  if (process.env.RESEND_API_KEY) {
    const svc = SERVICE_LABELS[service_slug] ?? { icon: '🐾', label: service_slug }
    const phone = digits.slice(-10)
    const waUrl = `https://wa.me/91${phone}`
    const adminUrl = `https://pawlocal-ashen.vercel.app/admin`

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PawLocal <onboarding@resend.dev>',
        to: 'melroy@verfolia.com',
        subject: `📣 New broadcast: ${svc.label} in ${area.trim()}`,
        html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f8fafc; color: #1e293b;">

  <div style="background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
    <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #94a3b8; margin: 0 0 12px;">New Broadcast · PawLocal</p>
    <h2 style="margin: 0 0 4px; font-size: 20px;">${svc.icon} ${svc.label}</h2>
    <p style="margin: 0; color: #64748b; font-size: 14px;">${area.trim()} · ${date_needed.trim()}</p>
  </div>

  <div style="background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; width: 80px;">From</td><td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${poster_name}</td></tr>
      <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">Pet</td><td style="padding: 6px 0; font-size: 14px;">${pet_description.trim()}</td></tr>
      <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">When</td><td style="padding: 6px 0; font-size: 14px;">${date_needed.trim()}</td></tr>
      ${budget?.trim() ? `<tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">Budget</td><td style="padding: 6px 0; font-size: 14px;">${budget.trim()}</td></tr>` : ''}
      ${notes?.trim() ? `<tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">Notes</td><td style="padding: 6px 0; font-size: 14px; font-style: italic;">${notes.trim()}</td></tr>` : ''}
    </table>
  </div>

  <a href="${waUrl}" style="display: block; background: #16a34a; color: white; text-decoration: none; padding: 16px; border-radius: 12px; text-align: center; font-weight: 700; font-size: 16px; margin-bottom: 12px;">
    💬 WhatsApp ${poster_name}
  </a>

  <a href="${adminUrl}" style="display: block; background: white; color: #475569; text-decoration: none; padding: 12px; border-radius: 12px; text-align: center; font-size: 14px; border: 1px solid #e2e8f0;">
    Open Admin Panel →
  </a>

</body>
</html>`,
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
