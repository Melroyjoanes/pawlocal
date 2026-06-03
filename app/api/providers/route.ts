import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database, CategorySlug } from '@/lib/supabase/types'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const body = await req.json()
  const {
    name, business_name, category_slug, category_slugs, whatsapp, phone,
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

  const { data: provider, error } = await supabase
    .from('providers')
    .insert({
      name,
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

  // Fire-and-forget admin notification — never blocks provider submission
  if (process.env.RESEND_API_KEY) {
    const primaryCategory = slugsArray[0] ?? category_slug
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PawLocal <onboarding@resend.dev>',
        to: 'melroy@verfolia.com',
        subject: `New provider joined: ${name}`,
        html: `
          <h2>New provider submitted on PawLocal</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Business:</strong> ${business_name ?? 'N/A'}</p>
          <p><strong>Category:</strong> ${primaryCategory}</p>
          <p><strong>WhatsApp:</strong> ${whatsapp}</p>
          <p><strong>Phone:</strong> ${phone ?? 'N/A'}</p>
          <p><a href="https://pawlocal.in/admin">Review in admin dashboard →</a></p>
        `,
      }),
    }).catch((err) => {
      console.error('Failed to send admin notification email:', err)
    })
  }

  return NextResponse.json({ success: true, id: provider.id })
}
