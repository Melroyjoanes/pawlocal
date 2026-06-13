import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {}

  if ('status' in body) {
    if (!['approved', 'rejected'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    update.status = body.status
  }

  if ('is_verified' in body) update.is_verified = Boolean(body.is_verified)

  if ('verification_tier' in body) {
    if (!['contacted', 'verified', 'certified'].includes(body.verification_tier)) {
      return NextResponse.json({ error: 'Invalid verification_tier' }, { status: 400 })
    }
    update.verification_tier = body.verification_tier
  }

  if ('lat' in body && 'lng' in body) {
    const lat = Number(body.lat)
    const lng = Number(body.lng)
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      update.lat = lat
      update.lng = lng
    }
  }

  // Full provider field edits
  if ('name' in body && body.name?.trim()) update.name = body.name.trim()
  if ('email' in body) update.email = body.email?.trim() || null
  if ('whatsapp' in body && body.whatsapp?.trim()) update.whatsapp = body.whatsapp.trim()
  if ('phone' in body) update.phone = body.phone?.trim() || null
  if ('bio' in body) update.bio = body.bio?.trim() || null
  if ('address' in body && body.address?.trim()) update.address = body.address.trim()
  if ('neighbourhood' in body && body.neighbourhood?.trim()) update.neighbourhood = body.neighbourhood.trim()
  if ('category_slug' in body) update.category_slug = body.category_slug
  if ('category_slugs' in body) update.category_slugs = body.category_slugs
  if ('price_min' in body) update.price_min = body.price_min != null ? Number(body.price_min) : null
  if ('price_max' in body) update.price_max = body.price_max != null ? Number(body.price_max) : null
  if ('price_unit' in body) update.price_unit = body.price_unit
  if ('hours_from' in body) update.hours_from = body.hours_from
  if ('hours_to' in body) update.hours_to = body.hours_to
  if ('working_days' in body) update.working_days = body.working_days
  if ('business_name' in body) update.business_name = body.business_name?.trim() || null
  if ('service_prices' in body) update.service_prices = body.service_prices ?? {}

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const admin = adminDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updatedProvider, error } = await (admin.from('providers') as any)
    .update(update)
    .eq('id', id)
    .select('id, name, email, category_slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const prov = updatedProvider as { id: string; name: string; email: string | null; category_slug: string } | null

  // When a provider is approved and has an email, send magic link
  if (update.status === 'approved' && prov?.email && process.env.RESEND_API_KEY) {
    try {
      const firstName = prov.name.split(' ')[0]
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pupstep.in'

      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: prov.email,
        options: { redirectTo: `${siteUrl}/pro/dashboard` },
      })

      if (!linkError && linkData?.properties?.action_link) {
        const magicLink = linkData.properties.action_link
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'PupStep <onboarding@resend.dev>',
            to: prov.email,
            subject: "You're approved on PupStep — click to access your dashboard",
            html: `<div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;background:#f0fdfa;padding:32px 24px;border-radius:24px;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="font-size:48px;margin-bottom:12px;">🐾</div>
    <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 8px;">You're approved, ${firstName}!</h1>
    <p style="font-size:14px;color:#475569;margin:0;">Your PupStep profile is live. Click below to access your provider dashboard.</p>
  </div>
  <a href="${magicLink}" style="display:block;text-align:center;background:oklch(0.48 0.17 196);color:white;font-weight:700;font-size:15px;padding:16px 28px;border-radius:12px;text-decoration:none;margin-bottom:20px;">
    Access my dashboard →
  </a>
  <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">Link expires in 1 hour.</p>
</div>`,
          }),
        }).catch((e: unknown) => { console.error('[Resend]', e) })
      }
    } catch {}
  }

  return NextResponse.json({ success: true })
}
