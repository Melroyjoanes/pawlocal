import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase/types'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

const SERVICE_LABELS: Record<string, { icon: string; label: string }> = {
  'dog-walking':  { icon: '🦮', label: 'Dog Walking' },
  'grooming':     { icon: '✂️', label: 'Grooming' },
  'vet':          { icon: '🏥', label: 'Vet' },
  'pet-store':    { icon: '🛍️', label: 'Pet Store' },
  'dog-training': { icon: '🎯', label: 'Dog Training' },
  'insurance':    { icon: '🛡️', label: 'Insurance' },
}

function maskPhone(digits: string): string {
  // Show +91 XXXX XX 1234 — last 4 digits only
  const last4 = digits.slice(-4)
  return `+91 XXXX XX ${last4}`
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

  // Check if caller is a signed-in approved provider — only they see real numbers
  const { data: { user } } = await supabase.auth.getUser()
  let isApprovedProvider = false

  if (user?.email) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: provider } = await (admin.from('providers') as any)
      .select('id')
      .eq('email', user.email)
      .eq('status', 'approved')
      .single()
    isApprovedProvider = !!provider
  }

  // Mask poster_whatsapp unless the caller is an approved provider
  const rows = (data ?? []).map((b) => ({
    ...b,
    poster_whatsapp: isApprovedProvider
      ? b.poster_whatsapp
      : maskPhone(b.poster_whatsapp),
    // Flag so client knows if the number is real
    whatsapp_visible: isApprovedProvider,
  }))

  return NextResponse.json(rows)
}

async function notifyMatchingProviders(
  serviceSlug: string,
  area: string,
  petDescription: string,
  dateNeeded: string,
  budget: string | null,
  posterName: string
) {
  if (!process.env.RESEND_API_KEY) return
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find approved providers matching the service category who have email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: providers } = await (admin.from('providers') as any)
    .select('id, name, email, category_slug, category_slugs')
    .eq('status', 'approved')
    .not('email', 'is', null)

  if (!providers?.length) return

  const svc = SERVICE_LABELS[serviceSlug] ?? { icon: '🐾', label: serviceSlug }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'

  const matching = (providers as { id: string; name: string; email: string; category_slug: string; category_slugs: string[] | null }[])
    .filter(p => {
      const slugs = p.category_slugs?.length ? p.category_slugs : [p.category_slug]
      return slugs.includes(serviceSlug)
    })

  // Fire-and-forget emails to all matching providers
  for (const provider of matching) {
    const firstName = provider.name.split(' ')[0]
    const dashboardUrl = `${siteUrl}/pro/dashboard`

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PupStep <onboarding@resend.dev>',
        to: provider.email,
        subject: `🐾 New ${svc.label} request in ${area} — ${posterName} needs help`,
        html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;background:#F0FDFA;padding:32px 20px;">

  <div style="text-align:center;margin-bottom:24px;">
    <div style="font-size:48px;margin-bottom:12px;">${svc.icon}</div>
    <h1 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 6px;">New request near you, ${firstName}!</h1>
    <p style="font-size:14px;color:#475569;margin:0;">A pet owner in <strong>${area}</strong> is looking for ${svc.label}</p>
  </div>

  <div style="background:white;border-radius:16px;padding:20px;border:1px solid #CCFBF1;margin-bottom:16px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:12px;width:80px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Pet</td><td style="padding:5px 0;font-size:14px;font-weight:600;color:#0f172a;">${petDescription}</td></tr>
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Date</td><td style="padding:5px 0;font-size:14px;color:#334155;">${dateNeeded}</td></tr>
      <tr><td style="padding:5px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Area</td><td style="padding:5px 0;font-size:14px;color:#334155;">${area}</td></tr>
      ${budget ? `<tr><td style="padding:5px 0;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Budget</td><td style="padding:5px 0;font-size:14px;color:#334155;">${budget}</td></tr>` : ''}
    </table>
  </div>

  <p style="font-size:13px;color:#64748b;text-align:center;margin:0 0 16px;">Sign in to your dashboard to view their WhatsApp number and respond.</p>

  <a href="${dashboardUrl}" style="display:block;text-align:center;background:oklch(0.48 0.17 196);color:white;font-weight:700;font-size:15px;padding:16px;border-radius:12px;text-decoration:none;margin-bottom:12px;">
    View request &amp; respond →
  </a>

  <p style="font-size:11px;color:#94a3b8;text-align:center;margin:0;">PupStep · Juhu, Mumbai · You received this because you're a matched provider.</p>

</body>
</html>`,
      }),
    }).catch(() => {})
  }
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

  // Require auth to post
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to post a broadcast' }, { status: 401 })
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
    user_id: user.id,
  } as never)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify admin (fire-and-forget)
  const adminEmail = process.env.ADMIN_EMAIL
  if (process.env.RESEND_API_KEY && adminEmail) {
    const svc = SERVICE_LABELS[service_slug] ?? { icon: '🐾', label: service_slug }
    const phone = digits.slice(-10)
    const waUrl = `https://wa.me/91${phone}`
    const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'}/admin`

    const safeName   = esc(poster_name)
    const safeArea   = esc(area.trim())
    const safeDate   = esc(date_needed.trim())
    const safePet    = esc(pet_description.trim())
    const safeBudget = esc(budget?.trim())
    const safeNotes  = esc(notes?.trim())
    const safeLabel  = esc(svc.label)

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PupStep <onboarding@resend.dev>',
        to: adminEmail,
        subject: `New broadcast: ${safeLabel} in ${safeArea}`,
        html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f8fafc; color: #1e293b;">
  <div style="background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
    <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #94a3b8; margin: 0 0 12px;">New Broadcast · PupStep</p>
    <h2 style="margin: 0 0 4px; font-size: 20px;">${svc.icon} ${safeLabel}</h2>
    <p style="margin: 0; color: #64748b; font-size: 14px;">${safeArea} · ${safeDate}</p>
  </div>
  <div style="background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; width: 80px;">From</td><td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${safeName}</td></tr>
      <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">Pet</td><td style="padding: 6px 0; font-size: 14px;">${safePet}</td></tr>
      <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">When</td><td style="padding: 6px 0; font-size: 14px;">${safeDate}</td></tr>
      ${budget?.trim() ? `<tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">Budget</td><td style="padding: 6px 0; font-size: 14px;">${safeBudget}</td></tr>` : ''}
      ${notes?.trim() ? `<tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">Notes</td><td style="padding: 6px 0; font-size: 14px; font-style: italic;">${safeNotes}</td></tr>` : ''}
    </table>
  </div>
  <a href="${waUrl}" style="display: block; background: #16a34a; color: white; text-decoration: none; padding: 16px; border-radius: 12px; text-align: center; font-weight: 700; font-size: 16px; margin-bottom: 12px;">
    WhatsApp ${safeName}
  </a>
  <a href="${adminUrl}" style="display: block; background: white; color: #475569; text-decoration: none; padding: 12px; border-radius: 12px; text-align: center; font-size: 14px; border: 1px solid #e2e8f0;">
    Open Admin Panel →
  </a>
</body>
</html>`,
      }),
    }).catch(() => {})

    // Notify matching providers (fire-and-forget)
    notifyMatchingProviders(
      service_slug,
      area.trim(),
      pet_description.trim(),
      date_needed.trim(),
      budget?.trim() || null,
      poster_name.trim()
    ).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
