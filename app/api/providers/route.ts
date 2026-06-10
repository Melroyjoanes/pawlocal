import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { CategorySlug } from '@/lib/supabase/types'

// Direct admin client — bypasses RLS reliably (no cookie/session interference)
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  const supabase = adminClient()

  const body = await req.json()
  const {
    name, email, business_name, category_slug, category_slugs, whatsapp, phone,
    lat, lng, address, price_min, price_max, price_unit,
    hours_from, hours_to, bio, photo_urls, metadata, is_emergency,
  } = body

  if (!name || !category_slug || !whatsapp || !lat || !lng || !address) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Build the slugs array: prefer the explicit array, fall back to wrapping the primary slug
  const slugsArray: string[] = Array.isArray(category_slugs) && category_slugs.length > 0
    ? category_slugs
    : [category_slug]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: provider, error } = await (supabase.from('providers') as any)
    .insert({
      name,
      email: email || null,
      business_name: business_name || null,
      category_slug: category_slug as CategorySlug,
      category_slugs: slugsArray,
      whatsapp,
      phone: phone || null,
      lat: Number(lat),
      lng: Number(lng),
      address,
      price_min: price_min ? Number(price_min) : null,
      price_max: price_max ? Number(price_max) : null,
      price_unit: price_unit ?? 'per session',
      hours_from: hours_from ?? '09:00',
      hours_to: hours_to ?? '18:00',
      bio: bio || null,
      metadata: metadata ?? null,
      is_emergency: is_emergency ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (photo_urls?.length > 0) {
    await supabase.from('provider_photos').insert(
      photo_urls.map((url: string, i: number) => ({
        provider_id: provider.id,
        url,
        is_primary: i === 0,
        sort_order: i,
      }))
    )
  }

  // Email notification to admin — fire and forget, never blocks provider
  if (process.env.RESEND_API_KEY) {
    const primaryCategory = slugsArray[0] ?? category_slug
    const categoryLabel = primaryCategory
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    const adminUrl = `https://pupstep.in/admin`
    const profileUrl = `https://pupstep.in/provider/${provider.id}`

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PupStep <onboarding@resend.dev>',
        to: 'melroy@verfolia.com',
        subject: `🐾 New provider: ${name} (${categoryLabel})`,
        html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f8fafc; color: #1e293b;">

  <div style="background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
    <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #94a3b8; margin: 0 0 12px;">New Provider · PawLocal</p>
    <h2 style="margin: 0 0 4px; font-size: 20px;">${name}</h2>
    <p style="margin: 0; color: #64748b; font-size: 14px;">${categoryLabel}${business_name ? ` · ${business_name}` : ''}</p>
  </div>

  <div style="background: white; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; width: 100px;">Email</td><td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${email || '—'}</td></tr>
      <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">WhatsApp</td><td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${whatsapp}</td></tr>
      <tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">Area</td><td style="padding: 6px 0; font-size: 14px;">${address}</td></tr>
      ${price_min ? `<tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px;">Pricing</td><td style="padding: 6px 0; font-size: 14px;">₹${price_min}${price_max ? `–${price_max}` : ''} ${price_unit ?? ''}</td></tr>` : ''}
      ${bio ? `<tr><td style="padding: 6px 0; color: #94a3b8; font-size: 13px; vertical-align: top;">Bio</td><td style="padding: 6px 0; font-size: 13px; color: #475569;">${bio}</td></tr>` : ''}
    </table>
  </div>

  <a href="${adminUrl}" style="display: block; background: #0f172a; color: white; text-decoration: none; padding: 16px; border-radius: 12px; text-align: center; font-weight: 700; font-size: 16px; margin-bottom: 12px;">
    ✓ Review &amp; Approve in Admin
  </a>

  <a href="${profileUrl}" style="display: block; background: white; color: #475569; text-decoration: none; padding: 12px; border-radius: 12px; text-align: center; font-size: 14px; border: 1px solid #e2e8f0;">
    View Profile →
  </a>

</body>
</html>`,
      }),
    }).catch((e: unknown) => { console.error("[Resend] email failed:", e instanceof Error ? e.message : e) })
  }

  return NextResponse.json({ success: true, id: provider.id })
}
